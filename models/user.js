var mongoose = require('mongoose');

var userSchema = mongoose.Schema({
    uname: String,
    pass: String,
    email: String,
    votes: [String],
    ethos: Number,
    logos: Number
});
userSchema.pre("save", function(next){
    var emailregex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    var unameregex = /^(\w){3,}$/;
    var uname = this.uname;
    var email = this.email;
    if(!emailregex.test(this.email)) {
        next(new Error("Invalid email"));
    }
    else if(!unameregex.test(this.uname)){
        next(new Error("Username must be one word (no spaces)."));
    }
    else if (this.uname.length<2) {
         next(new Error("Please enter a valid username."));
    }
    else{
        this.model('mong.users').findOne({$or:[{uname: uname}, {email: uname}]}, function (err, existuser){
            if(err){
                next(new Error(err));
            }
            else if(existuser){
                console.log(existuser);
                console.log(email == existuser.email);
                console.log(uname == existuser.uname);
                if (email == existuser.email) {
                    next(new Error("Email is already associated with another account."));
                }
                else if (uname == existuser.uname) {
                    next(new Error("Username is already associated with another account."));
                }
            }
            else{
                console.log("movin");
                next();
            }
        });
    }
});
module.exports = mongoose.model('mong.users', userSchema);
