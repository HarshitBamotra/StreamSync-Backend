const express = require("express");
const { createRoom, joinRoom, getRoomInfo, deleteRoom } = require("../controllers");


const apiRouter = express.Router();

apiRouter.get("/ping", (req, res)=>{
    res.status(200).json({msg: "API router is up and running"});
})

apiRouter.post("/rooms/create", createRoom);

apiRouter.post("/rooms/:roomId/join", joinRoom);

apiRouter.get("/rooms/:roomId", getRoomInfo);

apiRouter.delete("/rooms/:roomId", deleteRoom);

module.exports = apiRouter;
