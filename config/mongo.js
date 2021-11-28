const mongoose = require('mongoose')

const mongoURI = `mongodb://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}`;
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  dbName: process.env.MONGO_SESSION_DATABASE

}).then(() => {
    console.log("Connected to MongoDB")
})

module.exports = mongoose