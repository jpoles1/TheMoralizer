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
                votes: [String],
                ethos: Number,
                logos: Number
            });
            self.User = mongoose.model('mong.users', userSchema);
            userSchema.pre("save", function(next){
                var userdat = this;
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
                tags: [],
                counts: {},
                resp: {}
            });
            //postSchema.virtual('captcha').get(function(){return this.captcha}).set(function(name){this.captcha=name;});
            self.Post = mongoose.model('mong.posts', postSchema);
            postSchema.pre("save", function(next){
                var postdat = this;
                var wordregex =  /(\w){4,}/;
                var tagregex = /^\w(\s*,?\s*\w)*$/;
                var sentenceregex = /(\w+\s){4,}\w/;
                var optionregex = /\w+/;
                var validoptions = 0;
                if(postdat.options){
                    for (i = 0; i < postdat.options.length; i++) {
                        if(optionregex.test(postdat.options[i])==true){
                            validoptions++;
                        }
                    }
                }
                if(!wordregex.test(postdat.title)){
                    next(new Error("Title must be at least four characters long!"));
                }
                else if(!sentenceregex.test(postdat.post)){
                    next(new Error("Question must be at least five words long!"));
                }
                else if(!postdat.options){
                    next(new Error("Please submit at least two valid options"));
                }
                else if(validoptions!=postdat.options.length){
                    next(new Error("Please submit at least "+postdat.options.length+" valid options (at least two words)!"));
                }
                else if(!(tagregex.test(postdat.tags) || postdat.tags=="")){
                    next(new Error("Tags must be separate by commas, and no spaces are allowed (you may use underscore_to denote spaces)."));
                }
                else{
                    rest.get("https://www.google.com/recaptcha/api/siteverify?secret=6Lc82wQTAAAAABicK2uab_1pP0ZMRdYvdmH81AmC&response="+postdat.captcha).on('complete', function(data){
                        if(data.success==true){
                            next();
                        }
                        else{
                            next(new Error("Captcha Failed to Validate"));
                        }

                    });
                }
            });
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
        self.app.get("/yourq", function(req, res){
            if(req.signedCookies.login==1){
                res.sendfile("main.html");
            }
            else{
                res.redirect("/");
            }
        });
        self.app.get("/yourv", function(req, res){
            if(req.signedCookies.login==1){
                res.sendfile("main.html");
            }
            else{
                res.redirect("/");
            }
        });
        self.app.get("/getposts*", function(req, res){
            if(req.signedCookies.login==1){
                var mode = req.url.split("/")[2].trim();
                //numpost = req.body.numpost;
                var content = "";
                var query;
                var minposts = 15;
                if(mode=="yourq"){
                    query = {uname: req.signedCookies.uname};
                }
                else if(mode=="yourv"){
                    query = {};
                    query["resp."+req.signedCookies.uname] = {$exists: true};
                }
                else{
                    query = {};
                    query["resp."+req.signedCookies.uname] = {$exists: false};
                    mode = "main";
                }
                self.Post.find(query,function (err, records){
                    if(err){
                        res.send("<div class='entry' style='margin-bottom: 260px;'><h1 style='text-align: center'>Error fetching content! Hope to be back soon! <i class='fa fa-frown-o fa-1x'></i></br>"+err+"</h1></div>");
                    }
                    else{
                        for (i = 0; i < records.length; i++){
                            var myresponse;
                            try{
                                 myresponse = records[i].resp[req.signedCookies.uname];
                            }
                            catch(err){
                                myresponse = "Nope";
                            }
                            var curopt = records[i].options;
                            var optinputs = "";
                            for(j=0; j<curopt.length; j++){
                                var butclass = "button-secondary";
                                if(myresponse==j){
                                    console.log("found");
                                    butclass = butclass+" pure-button-selected";
                                }
                                optinputs = optinputs+"<a class='pure-button "+butclass+"' style='width: 100%; margin-top:15px;' optnum='"+j+"'>"+curopt[j]+"</a>"
                            }
                            var formclass= "selectedform";
                            if(isNaN(myresponse)){
                                optinputs = optinputs+"<a class='pure-button button-success' style='width: 100%; margin-top:15px;' optnum='submit'>Submit</a>"
                                formclass="optionform";
                            }
                            content = content+"<div class='entry'><h1>"+records[i].title+"</h1><h3 style='text-align: right; margin-top: -30px;'>"+records[i].uname+"</h3>"+records[i].post+"<hr><form id='"+records[i]._id+"' class='"+formclass+"'>"+optinputs+"</form></div>";
                        }
                        if(records.length<minposts){
                            content = content+"<div class='entry' style='margin-bottom: 260px;'><h1 style='text-align: center'>No more posts! <i class='fa fa-frown-o fa-1x'></i></h1></div>";
                        }
                        res.send(content);
                    }
                }).limit(25).sort({_id: -1});
            }
            else{
                res.redirect("/");
            }
        });
        self.app.post("/votesubmit", function(req, res){
            if(req.signedCookies.login==1){
                var choice = req.body.choice;
                var qid = req.body.qid;
                var uname = req.signedCookies.uname;
                var increaser = {}
                increaser["counts.opt"+choice]=1;
                var respadd = {};
                respadd["resp."+uname] = choice;
                var updater = {$inc: increaser, $set: respadd};
                console.log(updater);
                self.Post.findByIdAndUpdate(qid, updater, function (err, post){
                    if(err){
                        res.send("Failed to update post: "+err);
                    }
                    else{
                        self.User.update({uname: req.signedCookies.uname}, {$addToSet: {votes: qid}}, function(err){
                            if(err){
                                res.send("Failed to update your user profile: "+err);
                            }
                            else{
                                console.log(post);
                                self.User.update({uname: post.uname}, {$inc: {ethos: 1}}, function(err){
                                    if(err){
                                        res.send("Failed to update poster's profile: "+err);
                                    }
                                    else{
                                        res.send("success");
                                    }
                                });
                            }
                        });
                    }
                });
            }
            else{
                res.redirect("/");
            }
        });
        self.app.post("/asksubmit", function(req, res){
            if(req.signedCookies.login==1){
                var formdata = JSON.parse(req.body.dat);
                var title = formdata.title;
                var tags = formdata.tags;
                var post = formdata.post;
                var opt = formdata.opt;
                var captcha = formdata.captcha;
                var askadd = self.Post({
                    uname: req.signedCookies.uname,
                    title: title,
                    post: post,
                    options: opt,
                    tags: tags,
                    resp: {},
                    counts: {}
                });
                askadd.captcha = captcha;
                askadd.save(function(err){
                    if(err){
                        console.log(err);
                        res.send(err.toString());
                    }
                    else{
                        res.send("success");
                    }
                });
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
            self.User.findOne({uname: uname, pass: pass}, function (err, users) {
                if(users){
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
