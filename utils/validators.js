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

module.exports = {
  validateString,
  validateArray,
};
