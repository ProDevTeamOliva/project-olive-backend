const fs = require("fs");
const logger = require("../config/logger");
const driver = require("../config/neo4jDriver")

function saveBase64Picture(filepath, image) {
  image = image.split("base64,")[1];

  fs.writeFile("." + filepath, image, { encoding: "base64" }, function (err) {
    if (err) {
      logger.info(err);
    }
  });
}

const neo4jQueryWrapper = (query, parameters) => {
    const session = driver.session()
    return session.run(query, parameters)
        .finally(result => session.close().finally(() => {
            if(result instanceof Error) {
                throw result
            } else {
                return result
            }
        }))
}

module.exports = { saveBase64Picture, neo4jQueryWrapper };
