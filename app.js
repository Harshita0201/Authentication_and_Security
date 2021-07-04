//jshint esversion:6
require('dotenv').config();
const express=require("express");
const bodyParser=require("body-parser");
const ejs=require("ejs");
const mongoose =require("mongoose");
// const encrypt = require("mongoose-encryption");
// const md5=require("md5");
// const bcrypt= require("bcrypt");
// const saltRounds=10;

const session= require('express-session');
const passport = require("passport");
const passportLocalMongoose= require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy; // configure google oauth strategy for level6 authentication
const findOrCreate = require('mongoose-findorcreate');

const app=express();


app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({
  extended:true
}));

//set up session
app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUnitialized: false
}));

app.use(passport.initialize()); //initialize passport to use its authentication method
app.use(passport.session()); //passport to use session()

//connect to mongoose local db and create userDB
mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set("useCreateIndex",true);

//create schema for collections inside userDB
const userSchema=new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose); //helps to hash and salt passwords and save users to mongodb
userSchema.plugin(findOrCreate);


// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields :["password"]});

//create a mongoose model with collection name User (users)
const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser()); //create a cookie with a user
// passport.deserializeUser(User.deserializeUser()); // destroy cookie and verify the contents
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

//(set up and use) the passort strategy of google
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) { //the google sends back a access token that consist of pieces of info we reqested for and also we get their profile
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/",function(req,res){
  res.render("home");
});

//when the user clicks @ sign up with google button
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] })); //use passport to authenticate our user using google strategy and when it is done we want access to ther profile as well as user id on google.

//this is the page where the user will be taken back or redirected after googl's authentication i.e to our page
app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/secrets");
  });

app.get("/login",function(req,res){
  res.render("login");
});

app.get("/register",function(req,res){
  res.render("register");
});

app.get("/secrets", function(req, res){
  User.find({"secret": {$ne: null}}, function(err, foundUsers){
    if (err){
      console.log(err);
    } else {
      if (foundUsers) {
        res.render("secrets", {usersWithSecrets: foundUsers});
      }
    }
  });
});

app.get("/submit",function(req,res){
  if(req.isAuthenticated()){
    res.render("submit");
  }else{
    res.redirect("/login");
  }
});


app.get("/logout", function(req,res){
  //deauthenticate the user and end his session
  req.logout();
  res.redirect("/");
});

//when user submits a secret
app.post("/submit",function(req,res){
  const submittedSecret = req.body.secret;

//Once the user is authenticated and their session gets saved, their user details are saved to req.user.
  // console.log(req.user.id);

  User.findById(req.user.id, function(err, foundUser){
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        foundUser.secret = submittedSecret;
        foundUser.save(function(){
          res.redirect("/secrets");
        });
      }
    }
  });
});

app.post("/register",function(req,res){

  // //level 4 security
  //  bcrypt.hash(req.body.password, saltRounds, function(err, hash){ //takes password as plain text, no of salt rounds and a function that generates hash and stores it in db
  //    //create a new doc inside the users collection in our userDB
  //    const newUser= new User({
  //      email: req.body.username,
  //     // password: md5(req.body.password) //to turn this password to a irreversible hash level 3 hashing passwords
  //      password:hash
  //    });
  //
  //    //saving the credentials of user or the new doc inside our userDB
  //    newUser.save(function(err){
  //      if(err){
  //        console.log(err);
  //      }else{
  //        res.render("secrets"); //we only render the secrets page if the user gets successfully registered to our website.
  //      }
  //    });
  //
  //  });

  // using passport-local-mongoose package method, it will create a new user and save it our our db
  User.register({username: req.body.username}, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){ //authenticate using passport's method
        res.redirect("/secrets");
      });
    }
  });


});

app.post("/login",function(req,res){
  // //if we match the username in our db with the corresponding password in our db then only we verify the user and let him/her to login or enter
  //
  // //get the posted req of email and pass on login page
  // const username= req.body.username;
  // //const password= md5(req.body.password); //hash the enterd password for later comparison
  // const password=req.body.password;
  //
  //
  //
  // //using the findOne method of mongoose we find the provided username in our db and store it in array foundUser
  // User.findOne({email : username}, function(err, foundUser){
  //   if(err){
  //     console.log(err);
  //   }else{ //if there are no errors
  //
  //     if(foundUser){ //if the array of foundUser is true or contains something
  //     //   if(foundUser.password === password){ //we tap into the password of corresponding username and match it with password entered through login page
  //     //     res.render("secrets"); //if and ony if the password matches we render the secrets page
  //     //
  //     //   }
  //
  //     bcrypt.compare(password, foundUser.password, function(req,result){ //level 4 security : check the password entered against the hash generated in register page in our db
  //       if(result === true){
  //           res.render("secrets");
  //       }
  //     });
  //   }
  // }
  //
  // });

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if(err){
      console.log(err);
    }else{
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });



});

app.listen(3000, function(){
  console.log("Server started on post 3000.");
})
