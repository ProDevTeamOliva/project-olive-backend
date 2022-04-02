const passport = require("passport");
const router = require("express").Router();
const SessionUser = require("../models/SessionUser");
const neo4jDriver = require("../config/neo4jDriver");
const { authenticationCheck } = require("../utils/middlewares");
const { MissingCredentialsError } = require("../utils/errors");

router.post("/register", (req, res, next) => {
  const { nameFirst, nameLast, login, password } = req.body;

  SessionUser.register({ login }, password, (err, user) => {
    if (err) {
      err.message = `api${err.name}`;
      return next(err);
    }

    const session = neo4jDriver.session();
    session
      .run(
        "CREATE (u:User:ID {id: randomUUID(), nameFirst: $nameFirst, nameLast: $nameLast, login: $login, sessionUserID: $sessionUserID, avatar: $avatar, registrationDate:datetime()}) RETURN u",
        {
          nameFirst,
          nameLast,
          login: user.login,
          sessionUserID: user._id.toString(),
          avatar: "/public/pictures/avatar_default.png",
        }
      )
      .then(() =>
        res.status(201).json({
          message: "apiRegisterSuccess",
        })
      )
      .catch((err) => {
        SessionUser.findByIdAndDelete(user._id.toString(), () => next(err));
      })
      .then(() => session.close());
  });
});

router.post("/login", (req, res, next) => {
  passport.authenticate(
    "local",
    {
      badRequestMessage: new MissingCredentialsError(
        "apiMissingCredentialsError"
      ),
    },
    (err, user, info) => {
      if (err) {
        err.message = `api${err.name}`;
        return next(err);
      } else if (!user) {
        if (info.message instanceof MissingCredentialsError) {
          return next(info.message);
        }
        return next(info);
      }

      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        res.status(201).json({
          message: "apiLoginSuccess",
        });
      });
    }
  )(req, res, next);
});

router.post("/logout", authenticationCheck, (req, res) => {
  req.logout();
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.status(200).json({ message: "apiLogoutSuccess" });
  });
});

// router.get("/public/pictures/:picture", async (req, res) => {
//   return res.status(200);
// });

module.exports = router;
