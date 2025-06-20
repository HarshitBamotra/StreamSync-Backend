const express = require("express");
const bodyParser = require('body-parser');
const cors = require("cors");
const http = require('http');
const socketIo = require('socket.io');

const connectToDB = require("./config/db.config");
const {PORT} = require("./config/server.config");
const {setIo} = require("./config/socket.config");
const apiRouter = require("./routes");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

setIo(io);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true})); 
app.use(cors({
    origin: "*"
}));

app.use("/api", apiRouter);

app.get('/ping', (req, res)=>{
    return res.status(200).json({
        msg: "Server is up and running"
    });
});

app.listen(PORT, ()=>{
    console.log(`server listening on port ${PORT}`);
    connectToDB();
})