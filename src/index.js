const express = require("express");
const bodyParser = require('body-parser');
const cors = require("cors");
const http = require('http');
const socketIo = require('socket.io');

const connectToDB = require("./config/db.config");
const { PORT } = require("./config/server.config");
const { setIo } = require("./config/socket.config");
const apiRouter = require("./routes");
const {Room} = require("./models");
const {UserManager} = require("./utils");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

setIo(io);
require("./socket");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({
    origin: "*"
}));

app.use("/api", apiRouter);

app.get('/ping', (req, res) => {
    return res.status(200).json({
        msg: "Server is up and running"
    });
});

server.listen(PORT, () => {
    console.log(`server listening on port ${PORT}`);
    connectToDB();
})

setInterval(async () => {
    try {
        const now = new Date();
        const inactiveThreshold = 30 * 60 * 1000;

        const inactiveRooms = await Room.find({
            $or: [
                { isActive: false },
                {
                    lastActivity: {
                        $lt: new Date(now - inactiveThreshold)
                    }
                }
            ]
        });

        for (let room of inactiveRooms) {
            console.log(`Cleaning up inactive room: ${room.id}`);

            for (let participant of room.participants) {
                await UserManager.deleteUser(participant.id);
            }

            await Room.deleteOne({ _id: room._id });
        }

        if (inactiveRooms.length > 0) {
            console.log(`Cleaned up ${inactiveRooms.length} inactive rooms`);
        }
    } catch (error) {
        console.error('Error during cleanup:', error);
    }
}, 30 * 60 * 1000);