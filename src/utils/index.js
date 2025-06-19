const { v4: uuidv4 } = require('uuid');

function generateRoomId(){
    return uuidv4();
}

function generateUserId(){
    return uuidv4();
}

module.exports = {
    generateRoomId: generateRoomId,
    generateUserId: generateUserId
}