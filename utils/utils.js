const fs = require("fs");

function saveBase64Picture(filepath, image) {
  image = image.split("base64,")[1];

  fs.writeFile(filepath, image, { encoding: "base64" }, function (err) {
    if (err) {
      console.log(err);
    }
  });
}

module.exports = { saveBase64Picture };
