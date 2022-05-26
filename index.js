require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const passport = require("passport");
const passportLocal = require("passport-local");
const bodyParser = require("body-parser");
const fs = require("fs");
const session = require("./config/session");
const originHost = require("./config/originHost");
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

app.use(cors({ credentials: true, origin: originHost }));

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

const port = process.env.PORT;

server.listen(port, () => {
  logger.info(`Server listening on port ${port}`);
});
