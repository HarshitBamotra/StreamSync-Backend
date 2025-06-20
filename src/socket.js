const { getIo } = require("./config/socket.config");
const {RoomManager, UserManager} = require("./utils")
const io = getIo();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    let currentUser = null;
    let currentRoomId = null;

    socket.on('join-room', async (data) => {
        try {
            const { roomId, userId } = data;

            const room = await RoomManager.findRoom(roomId);
            const user = await UserManager.findUser(userId);

            if (!room || !user) {
                socket.emit('error', { message: 'Room or user not found' });
                return;
            }

            await RoomManager.updateParticipantSocket(roomId, userId, socket.id);

            currentUser = user;
            currentRoomId = roomId;

            socket.join(roomId);

            const updatedRoom = await RoomManager.findRoom(roomId);
            const participant = updatedRoom.participants.find(p => p.id === userId);

            socket.to(roomId).emit('user-joined', {
                participant: {
                    id: participant.id,
                    name: participant.name,
                    isHost: participant.isHost,
                    joinedAt: participant.joinedAt
                }
            });

            socket.emit('room-participants', {
                participants: updatedRoom.participants.map(p => ({
                    id: p.id,
                    name: p.name,
                    isHost: p.isHost,
                    joinedAt: p.joinedAt,
                    isAudioMuted: p.isAudioMuted,
                    isVideoEnabled: p.isVideoEnabled,
                    isScreenSharing: p.isScreenSharing
                }))
            });

            console.log(`User ${user.name} joined room ${roomId}`);
        } catch (error) {
            console.error('Error joining room:', error);
            socket.emit('error', { message: 'Failed to join room' });
        }
    });

    socket.on('offer', (data) => {
        socket.to(data.target).emit('offer', {
            offer: data.offer,
            sender: socket.id
        });
    });

    socket.on('answer', (data) => {
        socket.to(data.target).emit('answer', {
            answer: data.answer,
            sender: socket.id
        });
    });

    socket.on('ice-candidate', (data) => {
        socket.to(data.target).emit('ice-candidate', {
            candidate: data.candidate,
            sender: socket.id
        });
    });

    socket.on('toggle-audio', async (data) => {
        if (currentRoomId && currentUser) {
            const participant = await RoomManager.updateParticipantStatus(currentRoomId, currentUser.id, {
                isAudioMuted: data.isAudioMuted
            });

            if (participant) {
                socket.to(currentRoomId).emit('participant-audio-toggle', {
                    userId: currentUser.id,
                    isAudioMuted: data.isAudioMuted
                });
            }
        }
    });

    socket.on('toggle-video', async (data) => {
        if (currentRoomId && currentUser) {
            const participant = await RoomManager.updateParticipantStatus(currentRoomId, currentUser.id, {
                isVideoEnabled: data.isVideoEnabled
            });

            if (participant) {
                socket.to(currentRoomId).emit('participant-video-toggle', {
                    userId: currentUser.id,
                    isVideoEnabled: data.isVideoEnabled
                });
            }
        }
    });

    socket.on('toggle-screen-share', async (data) => {
        if (currentRoomId && currentUser) {
            const participant = await RoomManager.updateParticipantStatus(currentRoomId, currentUser.id, {
                isScreenSharing: data.isScreenSharing
            });

            if (participant) {
                socket.to(currentRoomId).emit('participant-screen-share-toggle', {
                    userId: currentUser.id,
                    isScreenSharing: data.isScreenSharing
                });
            }
        }
    });

    socket.on('kick-participant', async (data) => {
        try {
            if (!currentRoomId || !currentUser) {
                socket.emit('error', { message: 'Not in a room' });
                return;
            }

            const isHostUser = await RoomManager.isHost(currentRoomId, currentUser.id);
            if (!isHostUser) {
                socket.emit('error', { message: 'Only host can kick participants' });
                return;
            }

            const room = await RoomManager.findRoom(currentRoomId);
            const targetParticipant = room.participants.find(p => p.id === data.userId);

            if (!targetParticipant) {
                socket.emit('error', { message: 'Participant not found' });
                return;
            }

            if (targetParticipant.isHost) {
                socket.emit('error', { message: 'Cannot kick host' });
                return;
            }

            await RoomManager.removeParticipant(currentRoomId, data.userId);
            await UserManager.deleteUser(data.userId);

            if (targetParticipant.socketId) {
                io.to(targetParticipant.socketId).emit('kicked', {
                    reason: data.reason || 'You have been removed from the room'
                });
                io.sockets.sockets.get(targetParticipant.socketId)?.leave(currentRoomId);
            }

            socket.to(currentRoomId).emit('participant-kicked', {
                userId: data.userId,
                participantName: targetParticipant.name
            });

            socket.emit('kick-success', {
                userId: data.userId,
                participantName: targetParticipant.name
            });

            console.log(`User ${targetParticipant.name} was kicked from room ${currentRoomId}`);
        } catch (error) {
            console.error('Error kicking participant:', error);
            socket.emit('error', { message: 'Failed to kick participant' });
        }
    });

    socket.on('chat-message', (data) => {
        if (currentRoomId && currentUser) {
            const message = {
                id: uuidv4(),
                userId: currentUser.id,
                userName: currentUser.name,
                message: data.message,
                timestamp: new Date().toISOString()
            };

            io.to(currentRoomId).emit('chat-message', message);
        }
    });

    socket.on('leave-room', () => {
        handleUserLeave();
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        handleUserLeave();
    });

    async function handleUserLeave() {
        if (currentRoomId && currentUser) {
            try {
                const room = await RoomManager.findRoom(currentRoomId);
                if (!room) return;

                const participant = room.participants.find(p => p.id === currentUser.id);

                if (participant) {
                    
                    if (participant.isHost) {
                        const otherParticipants = room.participants.filter(p => !p.isHost && p.id !== currentUser.id);

                        if (otherParticipants.length > 0) {
                            
                            const newHost = otherParticipants[0];
                            await RoomManager.changeHost(currentRoomId, newHost.id);

                            io.to(currentRoomId).emit('host-changed', {
                                newHostId: newHost.id,
                                newHostName: newHost.name
                            });
                        } else {
                            await RoomManager.deactivateRoom(currentRoomId);
                        }
                    }

                    await RoomManager.removeParticipant(currentRoomId, currentUser.id);
                    await UserManager.deleteUser(currentUser.id);

                    socket.to(currentRoomId).emit('user-left', {
                        userId: currentUser.id,
                        userName: currentUser.name
                    });

                    console.log(`User ${currentUser.name} left room ${currentRoomId}`);
                }

                socket.leave(currentRoomId);
            } catch (error) {
                console.error('Error handling user leave:', error);
            }

            currentRoomId = null;
            currentUser = null;
        }
    }
});