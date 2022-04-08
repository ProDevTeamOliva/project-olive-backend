const AuthenticationError = require("passport/lib/errors/authenticationerror");

const authenticationCheck = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return next(new AuthenticationError("apiUnauthorizedError"));
  }
  next();
};

const wrapMiddleware = (middleware) => (socket, next) =>
  middleware(socket.request, {}, next);

module.exports = {
  authenticationCheck,
  wrapMiddleware,
};
