const isDevelopment = require("./config/isDevelopment");
if (isDevelopment) {
  require("dotenv").config();
}

const express = require("express");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const passportLocal = require("passport-local");
const bodyParser = require("body-parser");
const fs = require("fs");
const session = require("./config/session");
require("./socket/socket");
const logger = require("./config/logger");
const { picturesDir } = require("./utils/constants");
const SessionUser = require("./models/SessionUser");
const router = require("./routes/router");
const server = require("./config/server");

const app = require("./config/express");

if (!fs.existsSync(picturesDir)) {
  fs.mkdirSync(picturesDir, { recursive: true });
}

if (isDevelopment) {
  const cors = require("cors");
  const corsConfig = require("./config/cors");
  app.use(cors(corsConfig));
}

app.use(bodyParser.json({ limit: "15MB" }));
app.use(express.json());
app.use(cookieParser());

app.use(session);

app.use(passport.initialize());
app.use(passport.session());

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

app.use(router);

const errorHandler = require("./utils/errorHandler");
app.use(errorHandler);

const port = process.env.VITE_EXPRESS_PORT || 5000;

server.listen(port, () => {
  logger.info(`Server listening on port ${port}`);
});
