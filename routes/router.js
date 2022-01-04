const router = require("express").Router();
const access = require("./access")
const user = require("./user")

router.use("/", access)
router.use("/user", user)

module.exports = router;
