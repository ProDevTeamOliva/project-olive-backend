const fs = require("fs");
const logger = require("../config/logger");

function saveBase64Picture(filepath, image) {
  image = image.split("base64,")[1];

  fs.writeFile("." + filepath, image, { encoding: "base64" }, function (err) {
    if (err) {
      logger.info(err);
    }
  });
}

module.exports = { saveBase64Picture };
