var mongoose = require('mongoose');
var rest = require('restler');

var postSchema = mongoose.Schema({
    uname: String,
    title: String,
    post: String,
    options: [String],
    tags: [],
    counts: {},
    resp: {}
});
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
module.exports = mongoose.model('mong.posts', postSchema);
