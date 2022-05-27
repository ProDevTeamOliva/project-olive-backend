const expressSession = require("express-session");
const isDevelopment = require("./isDevelopment");
const mongoStore = require("./mongoStore");

module.exports = expressSession({
  secret: process.env.EXPRESS_SESSION_SECRET,
  saveUninitialized: false,
  resave: false,
  store: mongoStore,
  ...(isDevelopment ? undefined : {
    cookie: {
      sameSite: true,
      secure: true
    },
    proxy: true
  })
});
