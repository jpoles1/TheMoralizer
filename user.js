var mongoose = require('mongoose');

var userSchema = mongoose.Schema({
    uname: String,
    pass: String,
    email: String,
    votes: [String],
    ethos: Number,
    logos: Number
});
userSchema.methods.checkUser = function(uname, email, next, cb){
    this.model('mong.users').findOne({$or:[{uname: uname}, {email: email}]}, function (err, existuser){
        if(err){
            return err;
        }
        else{
            return existuser;
        }
    });
}
userSchema.pre("save", function(next){
    var emailregex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    var unameregex = /(\w){3,}/;
    console.log(!unameregex.test(this.uname));
    if(!emailregex.test(this.email)) {
        next(new Error("Invalid email"));
    }
    else if(!unameregex.test(this.uname)){
        next(new Error("Username must be one word (no spaces)."));
    }
    else if (this.uname.length < 2) {
         next(new Error("Please enter a valid username."));
    }
    else{
        this.checkUser(this.uname, this.email, next, function (err, existuser){
            var emailregex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
            var unameregex = /(\w){3,}/;
            if(err){
                next(new Error(err));
            }
            else if(existuser){
                if (this.email == existuser.email) {
                    next(new Error("Email is already associated with another account."));
                }
                else if (this.uname == existuser.uname) {
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
