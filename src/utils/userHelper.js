const {User} = require("../models");

class UserManager {
    static async createUser(userId, name, currentRoom = null) {
        const user = new User({
            id: userId,
            name,
            currentRoom,
            lastSeen: new Date()
        });

        await user.save();
        return user;
    }

    static async findUser(userId) {
        return await User.findOne({ id: userId });
    }

    static async updateUser(userId, updates) {
        return await User.findOneAndUpdate(
            { id: userId },
            { ...updates, lastSeen: new Date() },
            { new: true, upsert: true }
        );
    }

    static async deleteUser(userId) {
        return await User.deleteOne({ id: userId });
    }
}

module.exports = UserManager;