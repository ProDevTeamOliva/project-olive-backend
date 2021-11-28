require("dotenv").config();
const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const mongoURI = `mongodb://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}`;
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  dbName: process.env.MONGO_SESSION_DATABASE,
});

const SessionUser = new mongoose.Schema({});

SessionUser.plugin(passportLocalMongoose, {
  usernameField: "login"
});

module.exports = mongoose.model("SessionUser", SessionUser);
