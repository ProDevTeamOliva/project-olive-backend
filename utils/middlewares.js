const AuthenticationError = require("passport/lib/errors/authenticationerror");

module.exports = {
  authenticationCheck: (req, res, next) => {
    if (!req.isAuthenticated()) {
      return next(new AuthenticationError("apiUnauthorizedError"));
    }
    next();
  },
  
  wrapMiddleware: middleware => (socket, next) => {
    middleware(socket.request, {}, next);
  }
};
