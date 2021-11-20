const passport = require("passport");
const router = require("express").Router();
const SessionUser = require("../models/SessionUser");
const neo4jDriver = require("../config/neo4jDriver");

router.post("/register", async (req, res) => {
  const { nameFirst, nameLast, username, password } = req.body;

  SessionUser.register({ username }, password)
    .then((user) => {
      // const neo4jSession = neo4jDriver.session()

      // neo4jSession.run("merge (user:User {nameFirst: $nameFirst, nameLast: $nameLast, username: $username, sessionId: $sessionId}) return user")
      //     .subscribe

      return res.status(201).json({ message: "registered" });
    })
    .catch(() => {
      return res.status(400).json({ message: "error while registering" });
    });
});

router.post("/login", async (req, res) => {
  passport.authenticate("local", (err, user, info) => {
    if (!user && info) {
      return res.status(403).json({ message: "error logging in" });
    } else {
      req.login(user, () => {
        return res.status(201).json({ message: "logged in" });
      });
    }
  })(req, res);
});

router.post("/logout", async (req, res) => {
  if (req.isAuthenticated()) {
    req.logout();
    req.session.destroy(() => {
      return res.json({ message: "logged out" });
    });
  } else {
    return res.status(404).json({ message: "already logged out" });
  }
});

module.exports = router;
