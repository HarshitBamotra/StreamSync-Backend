const { RoomManager, UserManager, generateUserId, generateRoomId } = require("../utils");

async function createRoom(req, res) {
    try {
        const { hostName } = req.body;

        if (!hostName || hostName.trim().length === 0) {
            return res.status(400).json({ error: 'Host name is required' });
        }

        const hostId = generateUserId();
        const room = await RoomManager.createRoom(hostId, hostName.trim());

        await UserManager.createUser(hostId, hostName.trim(), room.id);

        res.json({
            success: true,
            roomId: room.id,
            hostId,
            room: {
                id: room.id,
                hostName: room.hostName,
                participantCount: room.participants.length,
                createdAt: room.createdAt
            }
        });
    } catch (error) {
        console.error('Error creating room:', error);
        res.status(500).json({ error: 'Failed to create room' });
    }
}

async function joinRoom(req, res) {
    try {
        const { roomId } = req.params;
        const { userName } = req.body;

        if (!userName || userName.trim().length === 0) {
            return res.status(400).json({ error: 'User name is required' });
        }

        const room = await RoomManager.findRoom(roomId);
        if (!room) {
            return res.status(404).json({ error: 'Room not found or inactive' });
        }

        const userId = generateUserId();
        const updatedRoom = await RoomManager.addParticipant(roomId, userId, userName.trim());


        await UserManager.createUser(userId, userName.trim(), roomId);

        res.json({
            success: true,
            userId,
            room: {
                id: updatedRoom.id,
                hostName: updatedRoom.hostName,
                participantCount: updatedRoom.participants.length,
                participants: updatedRoom.participants.map(p => ({
                    id: p.id,
                    name: p.name,
                    isHost: p.isHost,
                    joinedAt: p.joinedAt
                }))
            }
        });
    } catch (error) {
        console.error('Error joining room:', error);
        res.status(500).json({ error: 'Failed to join room' });
    }
}

async function getRoomInfo(req, res) {
    try {
        const { roomId } = req.params;
        const room = await RoomManager.findRoom(roomId);

        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        res.json({
            id: room.id,
            hostName: room.hostName,
            participantCount: room.participants.length,
            participants: room.participants.map(p => ({
                id: p.id,
                name: p.name,
                isHost: p.isHost,
                joinedAt: p.joinedAt,
                isAudioMuted: p.isAudioMuted,
                isVideoEnabled: p.isVideoEnabled,
                isScreenSharing: p.isScreenSharing
            })),
            createdAt: room.createdAt,
            isActive: room.isActive
        });
    } catch (error) {
        console.error('Error fetching room:', error);
        res.status(500).json({ error: 'Failed to fetch room details' });
    }
}

async function deleteRoom(req, res) {
    try {
        const { roomId } = req.params;
        const { userId } = req.body;

        const room = await RoomManager.findRoom(roomId);
        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        const isHostUser = await RoomManager.isHost(roomId, userId);
        if (!isHostUser) {
            return res.status(403).json({ error: 'Only host can delete room' });
        }

        const roomSockets = room.participants
            .filter(p => p.socketId)
            .map(p => p.socketId);
            
        const io = require('../socket').getIo();
        roomSockets.forEach(socketId => {
            io.to(socketId).emit('room-closed', { roomId, reason: 'Host ended the meeting' });
        });

        for (let participant of room.participants) {
            await UserManager.deleteUser(participant.id);
        }

        await RoomManager.deactivateRoom(roomId);

        res.json({ success: true, message: 'Room deleted successfully' });
    } catch (error) {
        console.error('Error deleting room:', error);
        res.status(500).json({ error: 'Failed to delete room' });
    }
}

module.exports = {
    createRoom: createRoom,
    joinRoom: joinRoom,
    getRoomInfo: getRoomInfo,
    deleteRoom: deleteRoom
}