var passport = require("passport");
var session = require("express-session");
var GoogleStrategy = require("passport-google-oauth20").Strategy;
//Setup session
router.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}))
router.use(passport.initialize());
router.use(passport.session());
//After authentication, pass back an object containing all our user data for the session (stored in req.user)
passport.serializeUser(function(db_record, done) {
  done(undefined, JSON.stringify({
    username: db_record.user,
    user_id: db_record.id,
    consent: db_record.consent,
    current_set: db_record.current_set ? db_record.current_set : "Chest Pain",
    first_name: db_record.first_name ? db_record.first_name : "Unk",
    teacher_auth: db_record.teacher_auth,
    admin_auth: db_record.admin_auth
  }));
});
passport.deserializeUser(function(userJson, done) {
  done(undefined, JSON.parse(userJson));
});
var createGoogUser = function(accessToken, refreshToken, profile, done){
  var primaryEmail = profile.emails[0].value;
  var user_obj = {
    first_name: profile.name.givenName,
    last_name: profile.name.familyName
  };
  models.User.findOrCreate({
    where: {user: primaryEmail, email: primaryEmail},
    defaults: user_obj
  })
  .spread(function(db_record, created) {
    if(created){
      console.log("Added New Google User to DB!")
    }
    done(undefined, db_record);
    return 1;
  });
}
var goog = new GoogleStrategy({
  clientID: process.env.GOOG_CLIENT_ID,
  clientSecret: process.env.GOOG_CLIENT_SECRET,
  callbackURL: process.env.BASE_URL + "/auth/goog/callback"
}, createGoogUser)
passport.use(goog);
//When user visits this page, Google authentication will begin.
router.get(process.env.BASE_URL + "/auth/goog", passport.authenticate("google", {
  scope: ["profile", "email"]
}))
//This page recieves a token from Google validating the user's login.
router.get(process.env.BASE_URL + "/auth/goog/callback", passport.authenticate("google", {
  successRedirect: process.env.BASE_URL + "/",
  failureRedirect: process.env.BASE_URL + "/auth"
}), function(req, res) {
  //Upon successful authentication, redirect home, or to redirect address passed in the URL
  var redirect = req.query["redirect"];
  res.redirect(redirect ? redirect : process.env.BASE_URL + "/");
});
