#!/bin/env node
//  OpenShift sample Node application
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
            self.User = require("./user.js");
            self.Post = require("./post.js");
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
                            var choices = records[i].counts;
                            var optinputs = "";
                            var progbar = "";
                            var total = 0;
                            var chcounts = [];
                            var colorpallate = ['#303E73', '#442F74', '#829DFF', '#A780FF', '#5064AD', '#6C4FAF', '#151D3A', '#20153A', '#000000'];
                            for(var k in choices){
                                total = total+ parseInt(records[i].counts[k]);
                                chcounts.push(records[i].counts[k]);
                            }
                            console.log(total);
                            for(j=0; j<curopt.length; j++){
                                var butclass = "button-secondary";
                                if(myresponse==j){
                                    butclass = butclass+" pure-button-selected";
                                }
                                optinputs = optinputs+"<a class='pure-button "+butclass+"' style='width: 100%; margin-top:15px;' optnum='"+j+"'>#"+parseInt(j+1)+" - "+curopt[j]+"</a>"
                                if(!isNaN(myresponse)){
                                    console.log(parseInt(chcounts[j])/total);
                                    var fract = parseInt(chcounts[j]*100/total);
                                    progbar = progbar + "<div class='progress-bar tooltip' title='"+curopt[j]+"' role='progressbar' aria-valuenow='60' aria-valuemin='0' aria-valuemax='100' style='border: 1px solid black; background-color:"+colorpallate[j]+";width: "+fract+"%;'>#"+parseInt(j+1)+" - "+fract+"%</div>";
                                }
                            }
                            var formclass= "selectedform";
                            if(isNaN(myresponse)){
                                optinputs = optinputs+"<a class='pure-button button-success' style='width: 100%; margin-top:15px;' optnum='submit'>Submit</a>"
                                formclass="optionform";
                            }
                            else{
                                formclass="doneform";
                                progbar = "</br><div class='progress'>"+progbar+"</div>";
                            }
                            content = content+"<div class='entry'><h1>"+records[i].title+"</h1><h3 style='text-align: right; margin-top: -30px;'>"+records[i].uname+"</h3>"+records[i].post+"<hr><form id='"+records[i]._id+"' class='"+formclass+"'>"+optinputs+"</form>"+progbar+"</div>";
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
                self.Post.findByIdAndUpdate(qid, updater, function (err, post){
                    if(err || !post){
                        res.send("Failed to update post: "+err);
                    }
                    else{
                        self.User.update({uname: req.signedCookies.uname}, {$addToSet: {votes: qid}}, function(err){
                            if(err){
                                res.send("Failed to update your user profile: "+err);
                            }
                            else{
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
