const { Schema, model } = require("../config/mongo");
const passportLocalMongoose = require("passport-local-mongoose");
const { validateString } = require("../utils/validators");
const { ValidationError } = require("../utils/errors");

const sessionUserSchema = new Schema({});

const passwordValidator = (password, cb) => {
    const re = new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])")
    if (!re.test(password)) {
        return cb(new ValidationError("apiValidationError"));
    }
    cb()
}
const usernameField = "login"
sessionUserSchema.plugin(passportLocalMongoose, {
  usernameField,
  passwordValidator
});
sessionUserSchema.path(usernameField).validate(validateString({max: 20}))

module.exports = model("SessionUser", sessionUserSchema);
