const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true
    },
    name: { 
        type: String, 
        required: true 
    },
    isHost: { 
        type: Boolean, 
        default: false 
    },
    socketId: { 
        type: String, 
        default: null 
    },
    joinedAt: { 
        type: Date, 
        default: Date.now 
    },
    isAudioMuted: { 
        type: Boolean, 
        default: true 
    },
    isVideoEnabled: { 
        type: Boolean, 
        default: false 
    },
    isScreenSharing: { 
        type: Boolean, 
        default: false 
    }
});

const roomSchema = new mongoose.Schema({
    id: { 
        type: String, 
        required: true, 
        unique: true 
    },
    hostId: { 
        type: String, 
        required: true 
    },
    hostName: { 
        type: String, 
        required: true 
    },
    participants: [participantSchema],
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    isActive: { 
        type: Boolean, 
        default: true 
    },
    lastActivity: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('Room', roomSchema);