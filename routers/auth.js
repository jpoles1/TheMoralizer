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
