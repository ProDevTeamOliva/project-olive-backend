const express = require("express");
const router = require("express").Router();
const access = require("./access");
const user = require("./user");
const me = require("./me");
const post = require("./post");
const { NotFoundError } = require("../utils/errors");
const { authenticationCheck } = require("../utils/middlewares");
const { picturesDir } = require("../utils/constants");

router.use("/", access);
router.use("/me", authenticationCheck, me);
router.use("/user", authenticationCheck, user);
router.use("/post", authenticationCheck, post);

router.use(`/public`, [authenticationCheck, express.static("public")]);
router.use(`/${picturesDir}`, [
  authenticationCheck,
  express.static(picturesDir),
]);

router.use((req, res, next) => {
  next(new NotFoundError("apiRouteNotFoundError"));
});

module.exports = router;
