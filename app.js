//jshint esversion:6
require('dotenv').config();
const express=require("express");
const bodyParser=require("body-parser");
const ejs=require("ejs");
const mongoose =require("mongoose");
const encrypt = require("mongoose-encryption");

const app=express();

app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({
  extended:true
}));

//connect to mongoose local db and create userDB
mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser: true, useUnifiedTopology: true});

//create schema for collections inside userDB
const userSchema=new mongoose.Schema({
  email: String,
  password:String
});


userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields :["password"]});

//create a mongoose model with collection name User (users)
const User = new mongoose.model("User", userSchema);


app.get("/",function(req,res){
  res.render("home");
});

app.get("/login",function(req,res){
  res.render("login");
});

app.get("/register",function(req,res){
  res.render("register");
});


app.post("/register",function(req,res){

  //create a new doc inside the users collection in our userDB
  const newUser= new User({
    email: req.body.username,
    password: req.body.password
  });

  //saving the credentials of user or the new doc inside our userDB
  newUser.save(function(err){
    if(err){
      console.log(err);
    }else{
      res.render("secrets"); //we only render the secrets page if the user gets successfully registered to our website.
    }
  });

});

app.post("/login",function(req,res){
  //if we match the username in our db with the corresponding password in our db then only we verify the user and let him/her to login or enter

  //get the posted req of email and pass on login page
  const username= req.body.username;
  const password= req.body.password;

  //using the findOne method of mongoose we find the provided username in our db and store it in array foundUser
  User.findOne({email : username}, function(err, foundUser){
    if(err){
      console.log(err);
    }else{ //if there are no errors
      if(foundUser){ //if the array of foundUser is true or contains something
        if(foundUser.password === password){ //we tap into the password of corresponding username and match it with password entered through login page
          res.render("secrets"); //if and ony if the password matches we render the secrets page

        }
      }
    }
  });

});









app.listen(3000, function(){
  console.log("Server started on post 3000.");
})