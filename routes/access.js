const passport = require("passport");
const router = require("express").Router();
const SessionUser = require("../models/SessionUser");
const { authenticationCheck } = require("../utils/middlewares");
const { MissingCredentialsError } = require("../utils/errors");
const {
  neo4jQueryWrapper,
  validateFields,
  disconnectSessionSockets,
} = require("../utils/utils");
const { picturesDir, avatarDefault } = require("../utils/constants");

router.post("/register", (req, res, next) => {
  const { nameFirst, nameLast, username, password } = req.body;

  if (!validateFields(next, { nameFirst, nameLast })) {
    return;
  }

  SessionUser.register({ username }, password, (err, user) => {
    if (err) {
      err.message = `api${err.name}`;
      return next(err);
    }
    const sessionUserID = user._id.toString();

    neo4jQueryWrapper(
      "MATCH (uc:UserCounter) CALL apoc.atomic.add(uc,'next',1) YIELD oldValue AS next CREATE (u:User {id: next, nameFirst: $nameFirst, nameLast: $nameLast, login: $login, sessionUserID: $sessionUserID, avatar: $avatar, registrationDate:datetime()}) RETURN u",
      {
        nameFirst,
        nameLast,
        login: username,
        sessionUserID,
        avatar: `/${avatarDefault}`,
      }
    )
      .then(() =>
        res.status(201).json({
          _id: sessionUserID,
          message: "apiRegisterSuccess",
        })
      )
      .catch((err) => {
        SessionUser.findByIdAndDelete(user._id.toString())
          .exec()
          .finally(() => next(err));
      });
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

router.post("/logout", authenticationCheck, (req, res, next) => {
  const sessionUserID = req.user._id.toString();
  const { sessionID } = req;

  neo4jQueryWrapper(
    "MATCH (u:User{sessionUserID:$sessionUserID}) OPTIONAL MATCH (u)-[:JOINED]->(c:Conversation) WITH u, collect(c) AS cl RETURN u, cl",
    {
      sessionUserID,
    }
  )
    .then(({ records: [record] }) => {
      const user = record.get("u").properties;
      const conversations = record.get("cl");
      return Promise.all([
        disconnectSessionSockets(`/user/${user.id}`, sessionID),
        ...conversations.map(({ properties: conversation }) =>
          disconnectSessionSockets(`/chat/${conversation.id}`, sessionID)
        ),
      ]);
    })
    .then(() => {
      req.logout();
      req.session.destroy(() => {
        res.clearCookie("connect.sid");
        res.status(200).json({ message: "apiLogoutSuccess" });
      });
    });
});

module.exports = router;
