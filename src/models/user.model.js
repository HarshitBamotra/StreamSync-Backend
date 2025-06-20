const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    name: { 
        type: String, 
        required: true 
    },
    currentRoom: { 
        type: String, 
        default: null 
    },
    lastSeen: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('User', userSchema);