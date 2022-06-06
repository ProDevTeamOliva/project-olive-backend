const neo4j = require("neo4j-driver");
const { check } = require("prettier");

const username = process.env.NEO4J_USERNAME;
const password = process.env.NEO4J_PASSWORD;
const host = process.env.NEO4J_HOST || "localhost";
const port = process.env.NEO4J_PORT_BOLT_TEST || 7688;

const driver = neo4j.driver(
  `bolt://${host}:${port}`,
  neo4j.auth.basic(username, password),
  {
    disableLosslessIntegers: true,
  }
);

const checkConnection = async () => {
  let connected = 0;
  while (!connected) {
    console.log(await driver.verifyConnectivity());
  }
};

module.exports = checkConnection;
