const passport = require("passport");
const sha256 = require("sha-256");
const router = require("express").Router();
const SessionUser = require("../models/SessionUser");
const neo4jDriver = require("../config/neo4jDriver");

router.post("/register", async (req, res) => {
  const { nameFirst, nameLast, login, password } = req.body;

  SessionUser.register({ username }, password)
    .then(async (user) => {
      const session = neo4jDriver.session();

      let rec = undefined;

      await session
        .run(
          "CREATE (a:User {nameFirst: $nameFirst, nameLast: $nameLast, username: $username, sessionUserID: $sUID}) RETURN ID(a)",
          { nameFirst: nameFirst,
            nameLast: nameLast,
            username: username,
            sUID: user._id
          }
        )
        .subscribe({
          onKeys: (keys) => {
            console.log(keys);
          },
          onNext: (record) => {
            rec = record.get("ID(a)");
            console.log(rec);
          },
          onCompleted: () => {
            session.close();
            return res.send({ id: rec });
          },
          onError: (error) => {
            console.log(error);
            session.close();
          },
        });

      return res.status(201).json({
        ...user._doc,
        salt: undefined,
        hash: undefined,
      });
    })
    .catch((error) => {
      const message = error.message;
      switch (error.name) {
        case "UserExistsError":
          return res.status(409).json({ message });

        case "MissingUsernameError":
        case "MissingPasswordError":
          return res.status(422).json({ message });

        default:
          return res.status(400).json({ message: "error" });
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
          hash: undefined,
        });
      });
    } else {
      const message = info.message;
      switch (info.name) {
        case undefined:
          return res.status(422).json({ message });

        case "IncorrectUsernameError":
        case "IncorrectPasswordError":
          return res.status(403).json({ message });

        default:
          return res.status(400).json({ message: "error" });
      }
    }
  })(req, res);
});

router.use((req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  } else {
    return res.status(401).json({ message: "Unauthorized" });
  }
});

router.post("/logout", async (req, res) => {
  req.logout();
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    return res.json({ message: "Logged out" });
  });
});

module.exports = router;
