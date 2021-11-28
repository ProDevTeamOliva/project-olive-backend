const { Schema, model } = require("../config/mongo");
const passportLocalMongoose = require("passport-local-mongoose");

const sessionUserSchema = new Schema({});

sessionUserSchema.plugin(passportLocalMongoose, {
  usernameField: "login",
});

module.exports = model("SessionUser", sessionUserSchema);
