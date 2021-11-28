const passport = require("passport");
const router = require("express").Router();
const SessionUser = require("../models/SessionUser");
const neo4jDriver = require("../config/neo4jDriver");

router.post("/register", async (req, res) => {
  const { nameFirst, nameLast, login, password } = req.body;

  SessionUser.register({ login }, password)
    .then((user) => {
      // const neo4jSession = neo4jDriver.session()

      // neo4jSession.run("merge (user:User {nameFirst: $nameFirst, nameLast: $nameLast, username: $username, sessionId: $sessionId}) return user")
      //     .subscribe

      return res.status(201).json({
        ...user._doc,
        salt: undefined,
        hash: undefined
      });
    })
    .catch(error => {
      const message = error.message
      switch (error.name) {
        case "UserExistsError":
          return res.status(409).json({message});
        
        case "MissingUsernameError":
        case "MissingPasswordError":
          return res.status(422).json({message});

        default:
          return res.status(400).json({message: "error"});
      }
      
    });
});

router.post("/login", async (req, res) => {
  passport.authenticate("local", (error, user, info) => {

    if (user) {
      req.login(user, () => {
        return res.status(201).json({
          ...user._doc,
          salt: undefined,
          hash: undefined
        });
      });
      
    } else {
      const message = info.message
      switch(info.name) {
        case undefined:
          return res.status(422).json({message});

        case "IncorrectUsernameError":
        case "IncorrectPasswordError":
          return res.status(403).json({message});

        default:
          return res.status(400).json({message: "error"});
      }
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
    return res.status(404).json({ message: "not logged in" });
  }
});

module.exports = router;
