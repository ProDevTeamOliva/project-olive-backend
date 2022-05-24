const { EntityError } = require("./errors");

const validateString =
  ({ min = 2, max = 60 } = {}) =>
  (value) =>
    (value instanceof String || typeof value === "string") &&
    value.length >= min &&
    value.length <= max;

const validateArray =
  ({ min = 0, max = 16, elementValidator } = {}) =>
  (value) =>
    value instanceof Array &&
    value.length >= min &&
    value.length <= max &&
    (!elementValidator || value.every((value) => elementValidator(value)));

const validatePicturesSize = (next, picturesArray) => {
  const isSizeRight = picturesArray.reduce((result, picture) => {
    if (!result) return false;

    const buffer = Buffer.from(
      picture.picture.substring(picture.picture.indexOf(",") + 1),
      "base64"
    );

    if (buffer.length / 1e6 <= 3) {
      return true;
    }

    return false;
  }, true);

  if (!isSizeRight) {
    next(new EntityError("apiEntityTooLarge"));
    return false;
  }

  return true;
};

module.exports = {
  validateString,
  validateArray,
  validatePicturesSize,
};
