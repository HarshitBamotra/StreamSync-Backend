const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: { 
        type: String, 
        unique: true 
    },
    name: String,
    currentRoom: String
});

module.exports = mongoose.model('User', userSchema);