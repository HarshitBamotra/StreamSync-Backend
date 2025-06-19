const { generateRoomId, generateUserId } = require("../utils");
const Room = require("../models/room.model");
const User = require("../models/user.model");


async function createRoom(req, res) {
    try {
        const { hostName } = req.body;
        if (!hostName) return res.status(400).json({ error: 'Host name is required' });

        const roomId = generateRoomId();
        const hostId = generateUserId();

        const participant = {
            userId: hostId,
            name: hostName.trim(),
            isHost: true,
            socketId: null,
            joinedAt: new Date(),
            isAudioMuted: true,
            isVideoEnabled: false,
            isScreenSharing: false
        };

        const room = new Room({
            id: roomId,
            hostId,
            hostName: hostName.trim(),
            participants: [participant],
            createdAt: new Date(),
            isActive: true
        });

        await room.save();

        await User.create({ userId: hostId, name: hostName.trim(), currentRoom: roomId });

        res.status(200).json({
            success: true,
            roomId,
            hostId,
            room: {
                id: room.id,
                hostName: room.hostName,
                participantCount: room.participants.length,
                createdAt: room.createdAt
            }
        });
    } catch (err) {
        console.error('Create room error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

async function joinRoom(req, res) {
    try {
        const { roomId } = req.params;
        const { userName } = req.body;
        if (!userName) return res.status(400).json({ error: 'User name is required' });

        const room = await Room.findOne({ roomId: roomId, isActive: true });
        if (!room) return res.status(404).json({ error: 'Room not found or inactive' });

        const userId = generateUserId();
        const participant = {
            userId: userId,
            name: userName.trim(),
            isHost: false,
            socketId: null,
            joinedAt: new Date(),
            isAudioMuted: true,
            isVideoEnabled: false,
            isScreenSharing: false
        };

        room.participants.push(participant);
        await room.save();

        await User.create({ userId: userId, name: userName.trim(), currentRoom: roomId });

        res.json({
            success: true,
            userId,
            room: {
                roomId: room.roomId,
                hostName: room.hostName,
                participantCount: room.participants.length,
                participants: room.participants.map(p => ({
                    userId: p.userId,
                    name: p.name,
                    isHost: p.isHost,
                    joinedAt: p.joinedAt
                }))
            }
        });
    } catch (err) {
        console.error('Join room error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

async function getRoomInfo(req, res) {
    try {
        const { roomId } = req.params;
        const room = await Room.findOne({ roomId: roomId });
        if (!room) return res.status(404).json({ error: 'Room not found' });

        res.json({
            roomId: room.id,
            hostName: room.hostName,
            participantCount: room.participants.length,
            participants: room.participants,
            createdAt: room.createdAt,
            isActive: room.isActive
        });
    } catch (err) {
        console.error('Get room error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

async function deleteRoom(req, res) {
    try {
        const { roomId } = req.params;
        const { userId } = req.body;

        const room = await Room.findOne({ roomId: roomId });
        if (!room) return res.status(404).json({ error: 'Room not found' });

        if (room.hostId !== userId) {
            return res.status(403).json({ error: 'Only host can delete room' });
        }

        room.isActive = false;
        await room.save();
        await User.deleteMany({ currentRoom: roomId });

        res.json({ success: true, message: 'Room closed' });

        
        room.participants.forEach(p => {
            if (p.socketId) {
                io.to(p.socketId).emit('room-closed', { roomId, reason: 'Host ended the meeting' });
            }
        });

    } catch (err) {
        console.error('Delete room error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}