const neo4j = require("neo4j-driver");
const logger = require("./logger");

const username = process.env.NEO4J_USERNAME;
const password = process.env.NEO4J_PASSWORD;
const host = process.env.NEO4J_HOST || "localhost";
const port = process.env.NEO4J_PORT_BOLT || 7687;

const driver = neo4j.driver(
  `bolt://${host}:${port}`,
  neo4j.auth.basic(username, password),
  {
    disableLosslessIntegers: true,
  }
);
driver
  .verifyConnectivity()
  .then(() => {
    logger.info("Connected to Neo4J");
  })
  .catch((error) => {
    logger.error("Can't connect to Neo4J\n", error);
  });

module.exports = driver;
