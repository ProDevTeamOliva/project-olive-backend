const { v4 } = require("uuid");

const generateLogin = (context, ee, next) => {
  context.vars.login = v4().replace(/-/g, "").slice(0, 20);
  return next();
};

module.exports = {
  generateLogin,
};
