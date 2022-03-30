const originHost = parseInt(process.env.HTTPS)
  ? `https://${process.env.FRONTEND_HOST}:${process.env.FRONTEND_PORT}`
  : `http://${process.env.FRONTEND_HOST}:${process.env.FRONTEND_PORT}`;

module.exports = originHost;
