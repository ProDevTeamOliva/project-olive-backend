const { UserExistsError, MissingUsernameError, MissingPasswordError, IncorrectPasswordError, IncorrectUsernameError } = require("passport-local-mongoose/lib/errors")
const AuthenticationError = require("passport/lib/errors/authenticationerror")
const { NotFoundError, MissingCredentialsError } = require("./errors")


module.exports = (err, req, res, next) => {
    const sendResponse = (err, code) => res.status(code).json({message: err.message})

    if(err instanceof NotFoundError) {
        sendResponse(err, 404)
    
    } else if(err instanceof AuthenticationError) {
        sendResponse(err, 401)

    } else if(err instanceof UserExistsError) {
        sendResponse(err, 409)

    } else if(err instanceof MissingUsernameError || err instanceof MissingPasswordError || err instanceof MissingCredentialsError) {
        sendResponse(err, 422)

    } else if(err instanceof IncorrectPasswordError || err instanceof IncorrectUsernameError) {
        err.message = "apiIncorrectCredentialsError"
        sendResponse(err, 403)

    } else {
        console.dir(err)
        res.status(500).json({message: "apiUnknownError"})
    }
}
