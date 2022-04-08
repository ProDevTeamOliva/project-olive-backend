const fs = require("fs");
const logger = require("../config/logger");
const driver = require("../config/neo4jDriver");
const { ValidationError } = require("./errors");
const { validateString, validateArray } = require("./validators");

function saveBase64Picture(filepath, image) {
  image = image.split("base64,")[1];

  fs.writeFile("." + filepath, image, { encoding: "base64" }, function (err) {
    if (err) {
      logger.info(err);
    }
  });
}

const neo4jQueryWrapper = (query, parameters) => {
  const session = driver.session();
  return session.run(query, parameters).finally((result) =>
    session.close().finally(() => {
      if (result instanceof Error) {
        throw result;
      } else {
        return result;
      }
    })
  );
};

const validationSetup = {
  nameFirst: validateString(),
  nameLast: validateString(),
  content: validateString({ max: 1024 }),
  tags: validateArray({ elementValidator: validateString() }),
  pictures: () => true,
  type: () => true,
  filename: () => true,
  avatar: () => true,
};
const validateFields = (next, fields) => {
  if (
    Object.entries(fields).every(([key, value]) => {
      const fieldFunction = validationSetup[key];
      return fieldFunction && fieldFunction(value);
    })
  ) {
    return true;
  } else {
    next(new ValidationError("apiValidationError"));
    return false;
  }
};

module.exports = { saveBase64Picture, neo4jQueryWrapper, validateFields };
