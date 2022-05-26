const expressSession = require("express-session");
const mongoStore = require("./mongoStore");

module.exports = expressSession({
  secret: process.env.EXPRESS_SESSION_SECRET,
  saveUninitialized: false,
  resave: false,
  store: mongoStore,
});
