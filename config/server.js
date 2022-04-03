const app = require("./express");
const logger = require("./logger");

let server;

if (parseInt(process.env.HTTPS)) {
  try {
    const https = require("https");
    const fs = require("fs");

    server = https.createServer(
      {
        key: fs.readFileSync("./ssl/my.key"),
        cert: fs.readFileSync("./ssl/my.crt"),
      },
      app
    );
  } catch (err) {
    if (err.code === "ENOENT") {
      logger.info("Can't find ssl keys. Using HTTP instead!");

      const http = require("http");
      server = http.createServer(app);
    } else {
      throw err;
    }
  }
} else {
  const http = require("http");
  server = http.createServer(app);
}

module.exports = server;
