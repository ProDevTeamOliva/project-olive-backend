module.exports = {
  uri: `mongodb://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}`,
  db: process.env.MONGO_SESSION_DATABASE,
};
