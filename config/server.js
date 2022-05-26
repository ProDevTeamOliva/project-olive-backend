const app = require("./express");
const http = require("http");

const server = http.createServer(app);

module.exports = server;
