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
    const session = driver.session();
    session
      .run("MERGE (p:Counter:PostCounter) ON CREATE SET p.id=$id MERGE (m:Counter:MessageCounter) ON CREATE SET m.id=$id return p,m", {
        id: neo4j.int(0)
      })
      .then((result) => {
        if (result.summary.counters._stats.nodesCreated) {
          logger.info("Created Counters");
        }
      })
      .finally(() => session.close());
  })
  .catch((error) => {
    logger.error("Can't connect to Neo4J\n", error);
  });

module.exports = driver;
