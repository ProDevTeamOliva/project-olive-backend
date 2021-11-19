// For testing

const SessionUser = require("./models/SessionUser");

SessionUser.register({ username: "userTest" }, "123abc").then(() => process.exit())