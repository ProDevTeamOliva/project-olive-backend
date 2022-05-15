const AuthenticationError = require("passport/lib/errors/authenticationerror");
const neo4j = require("neo4j-driver");
const { idRegexString } = require("./constants");
const { NotFoundError } = require("./errors");

const authenticationCheck = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return next(new AuthenticationError("apiUnauthorizedError"));
  }
  next();
};

const idRegex = new RegExp(`^${idRegexString}$`)
const parseIdParam = (req, res, next) => {
  const id = req.params.id
  if(!idRegex.test(id)) {
    return next(new NotFoundError("apiIdParamError"))
  }
  try {
    req.params.id = neo4j.int(id)
    next()
  } catch(e) {
    next(e)
  }
}
const parseIdQuery = (req, res, next) => {
  const id = req.query.id
  if(id===undefined || id==="") {
    req.query.id = undefined
    return next()
  } else if(!idRegex.test(id)) {
    return next(new NotFoundError("apiIdQueryError"))
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
