const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
    userId: String,
    name: String,
    isHost: Boolean,
    socketId: String,
    joinedAt: Date,
    isAudioMuted: Boolean,
    isVideoEnabled: Boolean,
    isScreenSharing: Boolean
});

const roomSchema = new mongoose.Schema({
    roomId: { 
        type: String, 
        unique: true 
    },
    hostId: String,
    hostName: String,
    participants: [participantSchema],
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    isActive: { 
        type: Boolean, 
        default: true 
    }
});

module.exports = mongoose.model('Room', roomSchema);