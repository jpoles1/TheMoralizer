#!/bin/env node
var express = require("express");
var app = express();
//Allow for HTTP POST parsing
var bodyParser = require("body-parser")
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
//Setup rendering engine
var dotengine = require('express-dot-engine');
app.engine('dot', dotengine.__express);
app.set('views', './views');
app.set('view engine', 'dot');
//Setup router
global.router = express.Router();
//And load in application config
require("dotenv").config({path: ".env"});
require("dotenv").config({path: "deploy.env"});
global.BASE_URL = "";
global.PORT = process.env.OPENSHIFT_NODEJS_PORT || 4000;
var mongourl = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGODB_URI || "mongodb://localhost:27017/moralizer";
//Setup DB connection
var mongoose = require("mongoose")
mongoose.connect(mongourl);
var db = mongoose.connection;
global.models = {}
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function (callback) {
    models.User = require("./models/user.js");
    models.Post = require("./models/post.js");
    //Run the routing
    router.use("/res", express.static("res"));
    require("./routers/router");
    app.use(BASE_URL, router);
    app.listen(PORT);
});
module.exports = app;
