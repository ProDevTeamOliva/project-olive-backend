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
const sio = require("./socket/socket");
const logger = require("./config/logger");

const app = require("./config/express");

require("./config/neo4jDriver");

const picturesDir = "public/pictures";

if (!fs.existsSync(`./${picturesDir}`)) {
  throw Error(
    `No public directory. Please create ./${picturesDir} directory inside project root!`
  );
}

app.use(cors({ credentials: true, origin: originHost }));

app.use(bodyParser.json({ limit: "5mb" }));
app.use(express.json());
app.use(cookieParser());

app.use(session);

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

const { authenticationCheck } = require("./utils/middlewares");
app.use(`/${picturesDir}`, [authenticationCheck, express.static(picturesDir)]);

const router = require("./routes/router");
app.use(router);

const errorHandler = require("./utils/errorHandler");
app.use(errorHandler);

const server = require("./config/server");
const port = process.env.PORT;

server.listen(port, () => {
  logger.info(`Server listening on port ${port}`);
});
