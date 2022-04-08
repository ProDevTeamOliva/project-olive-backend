const {
  UserExistsError,
  MissingUsernameError,
  MissingPasswordError,
  IncorrectPasswordError,
  IncorrectUsernameError,
} = require("passport-local-mongoose/lib/errors");
const AuthenticationError = require("passport/lib/errors/authenticationerror");
const {
  NotFoundError,
  MissingCredentialsError,
  FriendError,
  PostError,
  ValidationError,
} = require("./errors");
const { ValidationError: ValidationErrorMongoose } = require("mongoose").Error;

const logger = require("../config/logger");

module.exports = (err, req, res, next) => {
  const sendResponse = (err, code) =>
    res.status(code).json({ message: err.message });

  logger.error(err);

  if (err instanceof NotFoundError) {
    sendResponse(err, 404);
  } else if (err instanceof AuthenticationError) {
    sendResponse(err, 401);
  } else if (err instanceof UserExistsError) {
    sendResponse(err, 409);
  } else if (
    err instanceof MissingUsernameError ||
    err instanceof MissingPasswordError ||
    err instanceof MissingCredentialsError ||
    err instanceof ValidationErrorMongoose ||
    err instanceof ValidationError
  ) {
    sendResponse(err, 422);
  } else if (
    err instanceof IncorrectPasswordError ||
    err instanceof IncorrectUsernameError
  ) {
    err.message = "apiIncorrectCredentialsError";
    sendResponse(err, 403);
  } else if (err instanceof FriendError || err instanceof PostError) {
    sendResponse(err, 400);
  } else {
    console.dir(err);
    res.status(500).json({ message: "apiUnknownError" });
  }
};
