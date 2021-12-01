const neo4j = require("neo4j-driver");

const neo4jURL = `bolt://${process.env.NEO4J_HOST}:${process.env.NEO4J_PORT_BOLT}`;
const driver = neo4j.driver(
  neo4jURL,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD),
  {
    disableLosslessIntegers: true,
  }
);
driver
  .verifyConnectivity()
  .then(() => {
    console.log("Connected to Neo4J");
  })
  .catch((error) => {
    console.error("Can't connect to Neo4J\n", error);
  });

module.exports = driver;
