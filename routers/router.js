router.get("/", function (req, res) {
    //res.setHeader('Content-Type', 'text/html');
    if(req.signedCookies.login==1){
        res.sendfile("main.html");
    }
    else{
        res.sendfile("index.html");
        //res.send(self.cache_get('index.html') );
    }
});
router.get("/ask", function(req, res){
    if(req.signedCookies.login==1){
        res.sendfile("ask.html");
    }
    else{
        res.redirect("/");
    }
});
router.get("/account", function(req, res){
    if(req.signedCookies.login==1){
        res.sendfile("account.html");
    }
    else{
        res.redirect("/");
    }
});
router.get("/yourq", function(req, res){
    if(req.signedCookies.login==1){
        res.sendfile("main.html");
    }
    else{
        res.redirect("/");
    }
});
router.get("/yourv", function(req, res){
    if(req.signedCookies.login==1){
        res.sendfile("main.html");
    }
    else{
        res.redirect("/");
    }
});
router.get("/getposts*", function(req, res){
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
                    var addfract = 0;
                    var chcounts = [];
                    for(var k in choices){
                        total = total+ parseInt(records[i].counts[k]);
                        chcounts.push(records[i].counts[k]);
                    }
                    console.log(chcounts);
                    for(j=0; j<curopt.length; j++){
                        var butclass = "button-secondary";
                        if(myresponse==j){
                            butclass = butclass+" pure-button-selected";
                        }
                        optinputs = optinputs+"<a class='pure-button "+butclass+"' style='width: 100%; margin-top:15px;' optnum='"+j+"'>#"+parseInt(j+1)+" - "+curopt[j]+"</a>"
                        if(!isNaN(myresponse) && chcounts[j]>0){
                            var fract = parseInt(chcounts[j]*100/total);
                            console.log(fract);
                            var dispfract = fract;
                            if(j+1<curopt.length){
                                addfract+=fract;
                            }
                            else{
                                fract = 100-addfract;
                            }
                            var barcolor;
                            if(myresponse==j){
                                barcolor = '#1f8dd6';
                            }
                            else{
                                barcolor= 'grey';
                            }
                            progbar = progbar + "<div class='progress-bar tooltip' title='"+curopt[j]+" - "+dispfract+"% - "+chcounts[j]+" Votes' role='progressbar' aria-valuenow='60' aria-valuemin='0' aria-valuemax='100' style='border: 1px solid black; background-color:"+barcolor+";width: "+fract+"%;'>#"+parseInt(j+1)+" - "+dispfract+"%</div>";
                        }
                    }
                    var formclass= "selectedform";
                    if(isNaN(myresponse)){
                        optinputs = optinputs+"<a class='pure-button button-success' style='width: 100%; margin-top:15px;' optnum='submit'>Submit</a>"
                        formclass="optionform";
                    }
                    else{
                        formclass="doneform";
                        progbar = "</br><hr><h3>Results:</h3><div class='progress'>"+progbar+"</div>";
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
router.post("/votesubmit", function(req, res){
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
router.post("/asksubmit", function(req, res){
    if(req.signedCookies.login==1){
        var formdata = JSON.parse(req.body.dat);
        var title = formdata.title;
        var tags = formdata.tags;
        var post = formdata.post;
        var opt = formdata.opt;
        var counts = {};
        for(i=opt.length-1; i>=0; i--){
            counts["opt"+i] = 0;
        }
        console.log(counts);
        var captcha = formdata.captcha;
        var askadd = self.Post({
            uname: req.signedCookies.uname,
            title: title,
            post: post,
            options: opt,
            tags: tags,
            resp: {},
            counts: counts
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
router.get("/logout" , function(req, res){
    res.clearCookie("login");
    res.clearCookie("uname");
    res.redirect("/");
});
router.post("/signup", function (req, res) {
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
router.post("/signin", function(req, res){
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
