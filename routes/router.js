const router = require("express").Router();
const access = require("./access");
const user = require("./user");
const me = require("./me");
const post = require("./post");

router.use("/", access);
router.use("/me", me);
router.use("/user", user);
router.use("/post", post);

module.exports = router;
