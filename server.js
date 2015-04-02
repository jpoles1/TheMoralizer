#!/bin/env node
//  OpenShift sample Node application
var express = require('express');
var fs      = require('fs');
//var mongo = require('mongolian');
var mongo = require('mongodb');
var bodyparser = require("body-parser");
var md5 = require('MD5');
/**
 *  Define the sample application.
 */
var moralizer = function() {

    //  Scope.
    var self = this;


    /*  ================================================================  */
    /*  Helper functions.                                                 */
    /*  ================================================================  */

    /**
     *  Set up server IP address and port # using env variables/defaults.
     */
    self.setupVariables = function() {
        //  Set the environment variables we need.
        self.ipaddress = process.env.OPENSHIFT_NODEJS_IP;
        self.port      = process.env.OPENSHIFT_NODEJS_PORT || 8080;
        self.mongourl = process.env.OPENSHIFT_MONGODB_DB_URL;
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
            self.mongourl = "mongodb://localhost:27017";
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
    self.setupMongo = function(){
        //self.mongoserver = new mongo(self.mongourl);
        //console.log(self.mongourl+"/users");
        //self.userdb = self.mongoserver.db("users");

    }
    self.initializeServer = function() {
        self.app = express();
        self.app.use(bodyparser.urlencoded({ extended: false }));
        self.app.use("/res", express.static(__dirname + '/res', {dotfiles: "deny"}));
        self.app.get("/", function(req, res) {
            res.setHeader('Content-Type', 'text/html');
            //res.send(self.cache_get('index.html') );
            res.sendfile("index.html");
        });
        self.app.post("/signup", function(req, res) {
            var email = req.body.email;
            var uname = req.body.uname;
            var pass = req.body.pass;
            var regex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
            var emailval = email.match(regex);
            var emailuse = self.matchEmail(email);
            console.log(emailuse);
            if(emailval==null){
                res.send("Invalid email");
            }
            else if(emailuse > 0){
                res.send("Email is already associated with another user.")
            }
            else{
                /*self.userlist.insert({
                    uname: uname,
                    pass: pass,
                    email: email
                });*/
                self.mongoQuery(function() {
                    self.userlist.insert({
                            uname: uname,
                            pass: pass,
                            email: email
                    },
                    function (err, result) {
                        //console.log(result);
                    });
                });
                res.send("success");
            }
        });
    }
    self.matchEmail = function(email){
        var result;
        mongo.connect(self.mongourl+"/users", function(err, db){
            if(typeof err!=null){
                console.log("Error: "+err);
            }
            var userlist = db.collection("userlist");
            userlist.find({email: email}).toArray(function(err, docs){
                console.log(docs);
                result = docs.length;
            });
            db.close();
        });
        result=1;
        return result;
    }
    self.getMongoTimestamp = function(id){
        var timestamp = id.toString().substring(0,8);
        var date = new Date(parseInt(timestamp, 16)*1000);
        return date;
    }
    self.passwordHash = function(uname, pass){
        var date = new Date();
        return md5(date.getUTCMonth()+uname+pass+date.getUTCDay()+date.getUTCFullYear())
    }
    /**
     *  Initializes the application.
     */
    self.initialize = function() {
        self.setupVariables();
        self.populateCache();
        self.setupTerminationHandlers();
        //self.setupMongo();
        // Create the express server and routes.
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

