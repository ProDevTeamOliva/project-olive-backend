require("dotenv").config();
const express = require("express");
const http = require("http");
const expressSession = require("express-session");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const passport = require("passport");
const passportLocal = require("passport-local");
const bodyParser = require("body-parser");
const fs = require("fs");

const app = express();
const port = process.env.PORT;

const mongoStore = require("./config/mongoStore");
require("./config/neo4jDriver");

const server = http.createServer(app);

const picturesDir = "public/pictures";

if (!fs.existsSync(`./${picturesDir}`)) {
  throw Error(
    `No public directory. Please create ./${picturesDir} directory inside project root!`
  );
}

app.use(cors({ credentials: true, origin: "http://localhost:3000" }));
app.use(bodyParser.json({ limit: "5mb" }));
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

const { authenticationCheck } = require("./utils/middlewares");
app.use(`/${picturesDir}`, [
  authenticationCheck,
  express.static(picturesDir),
]);

const errorHandler = require("./utils/errorHandler");
app.use(errorHandler)

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
