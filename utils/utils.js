const fs = require("fs");
const logger = require("../config/logger");
const driver = require("../config/neo4jDriver");
const { ValidationError } = require("./errors");
const { validateString, validateArray } = require("./validators");
const sio = require("../config/socket");

const saveBase64Picture = (filepath, image) => {
  image = image.split("base64,")[1];

  fs.writeFile("." + filepath, image, { encoding: "base64" }, function (err) {
    if (err) {
      logger.info(err);
    }
  });
};

const deletePicture = (filepath) => {
  fs.rmSync("." + filepath, function (err) {
    if (err) {
      logger.info(err);
    }
  });
};

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

const disconnectSessionSockets = (namespace, sessionID) =>
  sio
    .of(namespace)
    .fetchSockets()
    .then((sockets) =>
      sockets.forEach((socket) => {
        if (socket.client.conn.request.sessionID === sessionID) {
          socket.disconnect();
        }
      })
    );

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

const getCallback = (args) => {
  const callback = args.slice(-1)[0];
  if (callback instanceof Function) {
    return callback;
  }
};

module.exports = {
  saveBase64Picture,
  neo4jQueryWrapper,
  validateFields,
  disconnectSessionSockets,
  getCallback,
  deletePicture,
};
