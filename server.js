#!/bin/env node
//  OpenShift sample Node application
var rest = require('restler');
var express = require('express');
var http = require("http");
var https = require('https');
var fs      = require('fs');
var bodyparser = require("body-parser");
//Cookies
var cookieParser = require('cookie-parser');
var Keygrip = require('keygrip');
//Pass encryption
var md5 = require('MD5');
//Setup DB
var mongoose = require('mongoose');
var moralizer = function() {
    var self = this;
    self.setupVariables = function() {
        self.ipaddress = process.env.OPENSHIFT_NODEJS_IP;
        self.port      = process.env.OPENSHIFT_NODEJS_PORT || 8080;
        self.mongourl = process.env.OPENSHIFT_MONGODB_DB_URL;
        self.usersCollectionName = "users";
        self.postsCollectionName = "posts";
        if (typeof self.ipaddress === "undefined") {
            //  Log errors on OpenShift but continue w/ 127.0.0.1 - this
            //  allows us to run/test the app locally.
            console.warn('No OPENSHIFT_NODEJS_IP var, using 127.0.0.1');
            self.ipaddress = "127.0.0.1";
            //self.ipaddress = "192.168.1.109";
        }
        if (typeof self.mongourl === "undefined") {
            //  Log errors on OpenShift but continue w/ 127.0.0.1 - this
            //  allows us to run/test the app locally.
            console.warn('No OPENSHIFT_MONGO_DB_URL var, using mongodb://localhost:27017');
            self.mongourl = "mongodb://morality:justicia@ds051110.mongolab.com:51110/automation";
            self.usersCollectionName = "moralizer.users";
            self.postsCollectionName = "moralizer.posts";
        }
    };


    /**
     *  Populate the cache.
     */
    self.populateCache = function() {
        if (typeof self.zcache === "undefined") {
            self.zcache = { 'index.html': '' };
        }

        //  Local cache for static content.
        self.zcache['index.html'] = fs.readFileSync('./index.html');
    };


    /**
     *  Retrieve entry (content) from cache.
     *  @param {string} key  Key identifying content to retrieve from cache.
     */
    self.cache_get = function(key) { return self.zcache[key]; };


    /**
     *  terminator === the termination handler
     *  Terminate server on receipt of the specified signal.
     *  @param {string} sig  Signal to terminate on.
     */
    self.terminator = function(sig){
        if (typeof sig === "string") {
           console.log('%s: Received %s - terminating sample app ...',
                       Date(Date.now()), sig);
           process.exit(1);
        }
        console.log('%s: Node server stopped.', Date(Date.now()) );
    };


    /**
     *  Setup termination handlers (for exit and a list of signals).
     */
    self.setupTerminationHandlers = function(){
        //  Process on exit and signals.
        process.on('exit', function() { self.terminator(); });

        // Removed 'SIGPIPE' from the list - bugz 852598.
        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
         'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function(element, index, array) {
            process.on(element, function() { self.terminator(element); });
        });
    };


    /*  ================================================================  */
    /*  App server functions (main app logic here).                       */
    /*  ================================================================  */

    /**
     *  Initialize the server (express) and create the routes and register
     *  the handlers.
     */
    self.setupMongoose = function(){
        mongoose.connect(self.mongourl);
        self.db = mongoose.connection;
        self.db.on('error', console.error.bind(console, 'connection error:'));
        self.db.once('open', function (callback) {
            var userSchema = mongoose.Schema({
                uname: String,
                pass: String,
                email: String,
                votes: [String]
            });
            self.User = mongoose.model('mong.users', userSchema);
            userSchema.pre("save", function(next){
                userdat = this;
                var emailregex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
                var unameregex = /(\w){3,}/
                self.User.findOne({$or:[{uname: userdat.uname}, {email: userdat.email}]}, function (err, existuser){
                    var signuperr;
                    if(err){
                        next(new Error(err));
                    }
                    else if (!emailregex.test(userdat.email)) {
                        next(new Error("Invalid email"));
                    }
                    else if(existuser){
                        if (userdat.email == existuser.email) {
                            next(new Error("Email is already associated with another account."));
                        }
                        else if (userdat.uname == existuser.uname) {
                            next(new Error("Username is already associated with another account."));
                        }
                    }
                    else if(!unameregex.test(userdat.uname)){
                        next(new Error("Username must be one word (no spaces)."));
                    }
                    else if (userdat.uname.length < 2) {
                         next(new Error("Please enter a valid username."));
                    }
                    else{
                        next();
                    }
                });
            });
            var postSchema = mongoose.Schema({
                uname: String,
                title: String,
                post: String,
                options: [String],
                tags: [String],
                counts: []
            });
            self.Post = mongoose.model('mong.posts', postSchema);
        });
    }
    self.initializeServer = function() {
        self.app = express();
        self.app.use(bodyparser.urlencoded({extended: false}));
        self.app.use(cookieParser(md5("MoRaLiTy")));
        self.app.use("/res", express.static(__dirname + '/res', {dotfiles: "deny"}));
        self.app.get("/", function (req, res) {
            //res.setHeader('Content-Type', 'text/html');
            if(req.signedCookies.login==1){
                res.sendfile("main.html");
            }
            else{
                res.sendfile("index.html");
                //res.send(self.cache_get('index.html') );
            }
        });
        self.app.get("/ask", function(req, res){
            if(req.signedCookies.login==1){
                res.sendfile("ask.html");
            }
            else{
                res.redirect("/");
            }
        });
        self.app.get("/getposts", function(req, res){
            //numpost = req.body.numpost;
            var posts = self.Post.find({});
            var content = "";
            posts.on('success', function (records){
                for (i = 0; i < records.length; i++){
                    var curopt = records[i].options;
                    var optinputs = "";
                    for(j=0; j<curopt.length; j++){
                        optinputs = optinputs+"<a class='pure-button button-secondary' style='width: 100%; margin-top:15px;' optnum='"+j+"'>"+curopt[j]+"</a>"
                    }
                    optinputs = optinputs+"<a class='pure-button button-success' style='width: 100%; margin-top:15px;' optnum='submit'>Submit</a>"
                    content = content+"<div class='entry'><h1>"+records[i].title+"</h1><h3>"+records[i].uname+"</h3>"+records[i].post+"<hr><form id='"+records[i]._id+"' class='optionform'>"+optinputs+"</form></div>";
                }
                res.send(content);
            });
            posts.on("failure", function(err){
               console.log(err);
            });
        });
        self.app.post("/votesubmit", function(req, res){
            if(req.signedCookies.login==1){
                var choice = req.body.choice;
                var qid = req.body.qid;
                var uname = req.signedCookies.uname;
                var increaser = {}
                increaser["choice.opt"+choice]=1;
                var respadd = {};
                respadd[uname] = choice;
                var vote = self.posts.updateById(
                   qid,
                   {$inc: increaser, $addToSet: {resp: respadd}}
                );
                vote.on('success', function () {
                    var updateuser = self.users.update({uname: uname}, {$addToSet: {votes: qid}});
                    updateuser.on("success", function(){
                        res.send("success");
                    });
                    updateuser.on("failure", function(err){
                        res.send("Failed to update user: "+err);
                    });
                });
                vote.on('failure', function (err) {
                    res.send("Failed to update post: "+err);
                });
            }
            else{
                res.redirect("/");
            }
        });
        self.app.post("/asksubmit", function(req, res){
            if(req.signedCookies.login==1){
                var wordregex =  /(\w){4,}/;
                var tagregex = /^\w(\s*,?\s*\w)*$/;
                var sentenceregex = /(\w+\s){4,}\w/;
                var optionregex = /\w+/;
                var formdata = JSON.parse(req.body.dat);
                var title = formdata.title;
                var tags = formdata.tags;
                var post = formdata.post;
                var opt = formdata.opt;
                var captcha = formdata.captcha;
                var validoptions = 0;
                for (i = 0; i < opt.length; i++) {
                    if(optionregex.test(opt[i])==true){
                        validoptions++;
                    }
                }
                if(!wordregex.test(title)){
                    res.send("Title must be at least four characters long!");
                }
                else if(!sentenceregex.test(post)){
                    res.send("Question must be at least five words long!");
                }
                else if(validoptions!=opt.length){
                    res.send("Please submit at least "+opt.length+" valid options (at least two words)!");
                }
                else if(!(tagregex.test(tags) || tags=="")){
                    res.send("Tags must be separate by commas, and no spaces are allowed (you may use underscore_to denote spaces).");
                }
                else{
                    rest.get("https://www.google.com/recaptcha/api/siteverify?secret=6Lc82wQTAAAAABicK2uab_1pP0ZMRdYvdmH81AmC&response="+captcha).on('complete', function(data){
                        if(data.success==true){
                            var counts = []
                            var askadd = self.posts.insert({
                                uname: req.signedCookies.uname,
                                title: title,
                                post: post,
                                options: opt,
                                tags: tags,
                                resp: [],
                                counts: {}
                            });
                            askadd.on('success', function () {
                                res.send("success");
                            });
                            askadd.on('failure', function (err) {
                                res.send(err);
                            });
                        }
                        else{
                            res.send("CAPTCHA FAILED!");
                        }
                    });
                }
            }
            else{
                res.redirect("/");
            }
        });
        self.app.get("/logout" , function(req, res){
            res.clearCookie("login");
            res.clearCookie("uname");
            res.redirect("/");
        });
        self.app.post("/signup", function (req, res) {
            var email = req.body.email.toLowerCase();
            var uname = req.body.uname.toLowerCase();
            var pass = req.body.pass;
            var regex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
            var unameregex = /^(\w)*$/;
            var emailval = email.match(regex);
            var emailuse = 1;
            var unameuse = 1;
            var newuser = new self.User({
                uname: uname,
                pass: pass,
                email: email,
                votes: []
            });
            newuser.save(function(err) {
                if(err){
                    console.log(err);
                    res.send(err.toString());
                }
                else{
                    res.cookie('login', 1, { signed: true });
                    res.cookie('uname', uname, { signed: true });
                    res.send("success");
                }
            });
        });
        self.app.post("/signin", function(req, res){
            var uname = req.body.uname;
            var pass = req.body.pass;
            var checkaccount = self.users.find({uname: uname, pass: pass});
            checkaccount.on('success', function (users) {
                if(users.length==1){
                    res.cookie('uname', uname, { signed: true });
                    res.cookie('login', 1, { signed: true });
                    res.send("correct");
                }
                else{
                    res.send("Incorrect Username or Password");
                }
            });
        });
    };
    self.getMongoTimestamp = function(id){
        var timestamp = id.toString().substring(0,8);
        var date = new Date(parseInt(timestamp, 16)*1000);
        return date;
    }
    self.passwordHash = function(uname, pass){
        var date = new Date();
        return md5(uname+pass);
    }
    /**
     *  Initializes the application.
     */
    self.initialize = function() {
        self.setupVariables();
        self.populateCache();
        self.setupTerminationHandlers();
        self.setupMongoose();
        self.initializeServer();
    };


    /**
     *  Start the server (starts up the sample application).
     */
    self.start = function() {
        //  Start the app on the specific interface (and port).
        self.app.listen(self.port, self.ipaddress, function() {
            console.log('%s: Node server started on %s:%d ...', Date(Date.now() ), self.ipaddress, self.port);
        });
    };

};   /*  Sample Application.  */



/**
 *  main():  Main code.
 */
var zapp = new moralizer();
zapp.initialize();
zapp.start();
