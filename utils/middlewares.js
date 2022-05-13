const AuthenticationError = require("passport/lib/errors/authenticationerror");
const neo4j = require("neo4j-driver")

const authenticationCheck = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return next(new AuthenticationError("apiUnauthorizedError"));
  }
  next();
};

const parseIdParam = (req, res, next) => {
  try {
    req.params.id = neo4j.int(req.params.id)
    next()
  } catch(e) {
    next(e)
  }
}
const parseIdQuery = (req, res, next) => {
  const id = req.query.id ?? ""
  if(!id.length) {
    req.query.id = undefined
    return next()
  }
  try {
    req.query.id = neo4j.int(id)
    next()
  } catch(e) {
    next(e)
  }
}

const wrapMiddleware = (middleware) => (socket, next) =>
  middleware(socket.request, {}, next);

module.exports = {
  authenticationCheck,
  wrapMiddleware,
  parseIdParam,
  parseIdQuery
};
