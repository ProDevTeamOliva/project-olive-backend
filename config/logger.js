const { createLogger, format, transports } = require("winston");
const { combine, timestamp, colorize, printf } = format;

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
};

const myFormat = format((info) => {
  const { level, message } = info;
  info.level = `[${level.toUpperCase()}]`;
  return info;
})();

const logger = createLogger({
  levels: levels,
  format: combine(
    myFormat,
    timestamp({ format: "DD-MM-YYYY HH:mm:ss.SSS" }),
    colorize(),
    printf((info) => `${info.timestamp} ${info.level} >>> ${info.message}`)
  ),
  transports: [
    new transports.Console({ timestamp: true }),
    new transports.File({ filename: "./logs/combined.log" }),
    new transports.File({ level: "error", filename: "./logs/error.log" }),
    new transports.File({ level: "info", filename: "./logs/info.log" }),
  ],
});

module.exports = logger;
