const express = require("express");
const bodyParser = require('body-parser');
const cors = require("cors");

const connectToDB = require("./config/db.config");
const {PORT} = require("./config/server.config");

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true})); 
app.use(bodyParser.text());
app.use(cors({
    origin: "*"
}));

app.get('/ping', (req, res)=>{
    return res.status(200).json({
        msg: "Server is up and running"
    });
});

app.listen(PORT, ()=>{
    console.log(`server listening on port ${PORT}`);
    connectToDB();
})