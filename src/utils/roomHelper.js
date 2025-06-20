const {Room} = require("../models");
const { generateRoomId } = require("./generateId");


class RoomManager {
    static async createRoom(hostId, hostName) {
        const roomId = generateRoomId();

        const room = new Room({
            id: roomId,
            hostId,
            hostName,
            participants: [{
                id: hostId,
                name: hostName,
                isHost: true,
                socketId: null,
                joinedAt: new Date(),
                isAudioMuted: false,
                isVideoEnabled: true,
                isScreenSharing: false
            }],
            isActive: true,
            lastActivity: new Date()
        });

        await room.save();
        return room;
    }

    static async findRoom(roomId) {
        return await Room.findOne({ id: roomId, isActive: true });
    }

    static async addParticipant(roomId, userId, userName, socketId = null) {
        const room = await Room.findOne({ id: roomId, isActive: true });
        if (!room) return null;

        const existingParticipant = room.participants.find(p => p.id === userId);
        if (existingParticipant) {
            existingParticipant.socketId = socketId;
            existingParticipant.lastSeen = new Date();
        } else {
            room.participants.push({
                id: userId,
                name: userName,
                isHost: false,
                socketId,
                joinedAt: new Date(),
                isAudioMuted: false,
                isVideoEnabled: true,
                isScreenSharing: false
            });
        }

        room.lastActivity = new Date();
        await room.save();
        return room;
    }

    static async removeParticipant(roomId, userId) {
        const room = await Room.findOne({ id: roomId });
        if (!room) return null;

        room.participants = room.participants.filter(p => p.id !== userId);
        room.lastActivity = new Date();
        await room.save();
        return room;
    }

    static async updateParticipantSocket(roomId, userId, socketId) {
        const room = await Room.findOne({ id: roomId, isActive: true });
        if (!room) return null;

        const participant = room.participants.find(p => p.id === userId);
        if (participant) {
            participant.socketId = socketId;
            room.lastActivity = new Date();
            await room.save();
        }
        return room;
    }

    static async updateParticipantStatus(roomId, userId, status) {
        const room = await Room.findOne({ id: roomId, isActive: true });
        if (!room) return null;

        const participant = room.participants.find(p => p.id === userId);
        if (participant) {
            Object.assign(participant, status);
            room.lastActivity = new Date();
            await room.save();
            return participant;
        }
        return null;
    }

    static async changeHost(roomId, newHostId) {
        const room = await Room.findOne({ id: roomId, isActive: true });
        if (!room) return false;

        room.participants.forEach(participant => {
            participant.isHost = false;
        });

        const newHost = room.participants.find(p => p.id === newHostId);
        if (newHost) {
            newHost.isHost = true;
            room.hostId = newHostId;
            room.hostName = newHost.name;
            room.lastActivity = new Date();
            await room.save();
            return true;
        }
        return false;
    }

    static async deactivateRoom(roomId) {
        const room = await Room.findOne({ id: roomId });
        if (room) {
            room.isActive = false;
            room.lastActivity = new Date();
            await room.save();
        }
        return room;
    }

    static async isHost(roomId, userId) {
        const room = await Room.findOne({ id: roomId, isActive: true });
        if (!room) return false;

        const participant = room.participants.find(p => p.id === userId);
        return participant && participant.isHost;
    }
}

module.exports = RoomManager;