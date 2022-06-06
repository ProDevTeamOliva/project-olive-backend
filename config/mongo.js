const mongoose = require("mongoose");
const logger = require("./logger");

const username = process.env.MONGO_USERNAME;
const password = encodeURIComponent(process.env.MONGO_PASSWORD);
const host = process.env.MONGO_HOST || "localhost";
const port = process.env.RUN_TEST == 1
  ? process.env.MONGO_PORT_TEST || 27018
  : process.env.MONGO_PORT || 27017;
const database = process.env.MONGO_DATABASE;

mongoose.connect(
  `mongodb://${username}:${password}@${host}:${port}/${database}`,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

mongoose.connection
  .on("connected", () => {
    logger.info("Connected to MongoDB");
  })
  .on("error", (error) => {
    logger.error("Error on MongoDB connection\n", error);
  })
  .on("disconnected", () => {
    logger.info("Disconnected from MongoDB");
  });

module.exports = mongoose;
