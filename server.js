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
global.BASE_URL = "";
global.PORT = process.env.OPENSHIFT_NODEJS_PORT || 4000;
global.mongourl = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGODB_URI;
//Setup DB connection
var mongoose = require("mongoose")
mongoose.connect(mongourl);
global.db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function (callback) {
    self.User = require("./user.js");
    self.Post = require("./post.js");
});
//Run the routing
router.use(express.static("res"));
require("./routers/router");
app.use(BASE_URL, router);
app.listen(PORT);
module.exports = app;
