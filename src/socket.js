const { getIo } = require("./config/socket.config");
const Room = require("./models/room.model");
const User = require("./models/user.model");
const io = getIo();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    let currentUser = null;
    let currentRoom = null;

    socket.on('join-room', async (roomId, userId) => {
        try {
            const room = await Room.findOne({ id: roomId, isActive: true });
            if (!room) {
                socket.emit('error', { message: 'Room not found' });
                return;
            }

            const participant = room.participants.find(p => p.userId === userId);
            if (!participant) {
                socket.emit('error', { message: 'User not in room' });
                return;
            }

            participant.socketId = socket.id;

            await room.save();

            socket.join(roomId);

            socket.to(roomId).emit('user-joined', {
                participant: {
                    userId: participant.userId,
                    name: participant.name,
                    isHost: participant.isHost,
                    joinedAt: participant.joinedAt
                }
            });

            socket.emit('room-participants', {
                participants: room.participants.map(p => ({
                    userId: p.userId,
                    name: p.name,
                    isHost: p.isHost,
                    isAudioMuted: p.isAudioMuted,
                    isVideoEnabled: p.isVideoEnabled,
                    isScreenSharing: p.isScreenSharing
                }))
            });

            console.log(`User ${participant.name} joined room ${roomId}`);
        } catch (error) {
            console.error('Error joining room:', error);
            socket.emit('error', { message: 'Failed to join room' });
        }
    });

    // WebRTC signaling
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

    // Media controls

    socket.on('toggle-audio', async ({ roomId, userId, isAudioMuted }) => {
        const room = await Room.findOne({ roomId: roomId });
        if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }

        const participant = room.participants.find(p => p.id === userId);
        if (!participant) {
            socket.emit('error', { message: 'participant not found' });
            return;
        }

        participant.isAudioMuted = isAudioMuted;
        await room.save();

        socket.to(roomId).emit('participant-audio-toggle', { userId, isAudioMuted });
    });

    socket.on('toggle-video', async ({ roomId, userId, isVideoEnabled }) => {
        const room = await Room.findOne({ roomId: roomId });
        if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }

        const participant = room.participants.find(p => p.userId === userId);
        if (!participant) {
            socket.emit('error', { message: 'participant not found' });
            return;
        }

        participant.isVideoEnabled = isVideoEnabled;
        await room.save();
        socket.to(roomId).emit('participant-video-toggle', { userId, isVideoEnabled });
    });

    socket.on('toggle-screen-share', (data) => {
        if (currentRoom && currentUser) {
            const participant = currentRoom.updateParticipantStatus(currentUser.id, {
                isScreenSharing: data.isScreenSharing
            });

            if (participant) {
                socket.to(currentRoom.id).emit('participant-screen-share-toggle', {
                    userId: currentUser.id,
                    isScreenSharing: data.isScreenSharing
                });
            }
        }
    });

    // Kick participant (host only)
    socket.on('kick-participant', (data) => {
        try {
            if (!currentRoom || !currentUser) {
                socket.emit('error', { message: 'Not in a room' });
                return;
            }

            if (!currentRoom.isHost(currentUser.id)) {
                socket.emit('error', { message: 'Only host can kick participants' });
                return;
            }

            const targetParticipant = currentRoom.getParticipant(data.userId);
            if (!targetParticipant) {
                socket.emit('error', { message: 'Participant not found' });
                return;
            }

            if (targetParticipant.isHost) {
                socket.emit('error', { message: 'Cannot kick host' });
                return;
            }

            // Remove participant
            currentRoom.removeParticipant(data.userId);
            users.delete(data.userId);

            // Notify kicked user
            if (targetParticipant.socketId) {
                io.to(targetParticipant.socketId).emit('kicked', {
                    reason: data.reason || 'You have been removed from the room'
                });
                io.sockets.sockets.get(targetParticipant.socketId)?.leave(currentRoom.id);
            }

            // Notify other participants
            socket.to(currentRoom.id).emit('participant-kicked', {
                userId: data.userId,
                participantName: targetParticipant.name
            });

            socket.emit('kick-success', {
                userId: data.userId,
                participantName: targetParticipant.name
            });

            console.log(`User ${targetParticipant.name} was kicked from room ${currentRoom.id}`);
        } catch (error) {
            console.error('Error kicking participant:', error);
            socket.emit('error', { message: 'Failed to kick participant' });
        }
    });

    // Chat messages
    socket.on('chat-message', (data) => {
        if (currentRoom && currentUser) {
            const message = {
                id: uuidv4(),
                userId: currentUser.id,
                userName: currentUser.name,
                message: data.message,
                timestamp: new Date().toISOString()
            };

            // Broadcast to all participants in room
            io.to(currentRoom.id).emit('chat-message', message);
        }
    });

    // Leave room
    socket.on('leave-room', () => {
        handleUserLeave();
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        handleUserLeave();
    });

    function handleUserLeave() {
        if (currentRoom && currentUser) {
            const participant = currentRoom.getParticipant(currentUser.id);

            if (participant) {
                // If host is leaving, transfer host to another participant or close room
                if (participant.isHost) {
                    const otherParticipants = currentRoom.getAllParticipants()
                        .filter(p => !p.isHost && p.id !== currentUser.id);

                    if (otherParticipants.length > 0) {
                        // Transfer host to first available participant
                        const newHost = otherParticipants[0];
                        currentRoom.changeHost(newHost.id);

                        // Notify all participants about host change
                        io.to(currentRoom.id).emit('host-changed', {
                            newHostId: newHost.id,
                            newHostName: newHost.name
                        });
                    } else {
                        // No other participants, close room
                        currentRoom.isActive = false;
                        rooms.delete(currentRoom.id);
                    }
                }

                // Remove participant
                currentRoom.removeParticipant(currentUser.id);
                users.delete(currentUser.id);

                // Notify others
                socket.to(currentRoom.id).emit('user-left', {
                    userId: currentUser.id,
                    userName: currentUser.name
                });

                console.log(`User ${currentUser.name} left room ${currentRoom.id}`);
            }

            socket.leave(currentRoom.id);
            currentRoom = null;
            currentUser = null;
        }
    }
});