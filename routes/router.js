const passport = require("passport");
const router = require("express").Router();

router.post("/login", passport.authenticate("local"), (req, res) => {
    return res.status(201).json({message: "logged in"})
});

router.post("/logout", (req, res) => {
    req.logout()
    return res.status(200).json({message: "logged out"})
})

module.exports = router;