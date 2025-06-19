const express = require("express");


const apiRouter = express.Router();

apiRouter.get("/ping", (req, res)=>{
    res.status(200).json({msg: "API router is up and running"});
})



module.exports = apiRouter;
