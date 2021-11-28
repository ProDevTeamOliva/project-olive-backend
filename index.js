require("dotenv").config();
const express = require("express");
const http = require("http");
const expressSession = require("express-session");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const passport = require("passport");
const passportLocal = require("passport-local");

const app = express();
const port = process.env.PORT;

const mongoStore = require("./config/mongoStore");

const server = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(
  expressSession({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
    store: mongoStore,
  })
);
app.use(passport.initialize());
app.use(passport.session());
const SessionUser = require("./models/SessionUser");
passport.use(
  new passportLocal.Strategy(
    {
      usernameField: "login",
    },
    SessionUser.authenticate()
  )
);
passport.serializeUser(SessionUser.serializeUser());
passport.deserializeUser(SessionUser.deserializeUser());

const router = require("./routes/router");
app.use(router);

require("./config/neo4jDriver");

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
