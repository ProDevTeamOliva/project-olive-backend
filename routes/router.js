const router = require("express").Router();
const access = require("./access")
const user = require("./user")
const me = require("./me")

router.use("/", access)
router.use("/me", me)
router.use("/user", user)

module.exports = router;
