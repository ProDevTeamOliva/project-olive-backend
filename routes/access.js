const passport = require("passport");
const router = require("express").Router();
const SessionUser = require("../models/SessionUser");
const neo4jDriver = require("../config/neo4jDriver");
const { accessRegister } = require("../cypher/requests");

router.post("/register", async (req, res) => {
  const { nameFirst, nameLast, login, password } = req.body;

  SessionUser.register({ login }, password)
    .then(async (user) => {
      const session = neo4jDriver.session();
      session
        .run(accessRegister, {
          nameFirst,
          nameLast,
          login: user.login,
          sessionUserID: user._id.toString(),
          avatar: "/public/pictures/avatar_default.png",
        })
        .subscribe({
          onCompleted: () => {
            session.close();

            return res.status(201).json({
              message: "apiRegisterSuccess",
            });
          },
          onError: (error) => {
            session.close();
            SessionUser.findByIdAndDelete(user._id.toString(), () => {
              return res.status(500).json({ message: "apiServerError" });
            });
          },
        });
    })
    .catch((error) => {
      const message = `api${error.name}`;
      switch (error.name) {
        case "UserExistsError":
          return res.status(409).json({ message });

        case "MissingUsernameError":
        case "MissingPasswordError":
          return res.status(422).json({ message });

        default:
          return res.status(400).json({ message: "apiUnknownError" });
      }
    });
});

router.post("/login", async (req, res) => {
  passport.authenticate("local", (error, user, info) => {
    if (user) {
      req.login(user, () => {
        return res.status(201).json({
          message: "apiLoginSuccess",
        });
      });
    } else if (info.message === "Missing credentials") {
      return res.status(422).json({ message: "apiMissingCredentialsError" });
    } else {
      switch (info.name) {
        case "IncorrectUsernameError":
        case "IncorrectPasswordError":
          return res
            .status(403)
            .json({ message: "apiIncorrectCredentialsError" });

        default:
          return res.status(400).json({ message: "apiUnknownError" });
      }
    }
  })(req, res);
});

router.use(async (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  } else {
    return res.status(401).json({ message: "apiUnauthorizedError" });
  }
});

router.post("/logout", async (req, res) => {
  req.logout();
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    return res.status(200).json({ message: "apiLogoutSuccess" });
  });
});

// router.get("/public/pictures/:picture", async (req, res) => {
//   return res.status(200);
// });

module.exports = router;
