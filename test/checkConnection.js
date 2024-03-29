if (process.env.RUN_TEST == 2) {
  const neo4j = require("neo4j-driver");
  const { config } = require("dotenv");

  config();

  const username = process.env.NEO4J_USERNAME;
  const password = process.env.NEO4J_PASSWORD;
  const host = process.env.NEO4J_HOST || "localhost";
  const port =
    process.env.RUN_TEST == 2
      ? process.env.NEO4J_PORT_BOLT_TEST || 7688
      : process.env.NEO4J_PORT_BOLT || 7687;

  const driver = neo4j.driver(
    `bolt://${host}:${port}`,
    neo4j.auth.basic(username, password),
    {
      disableLosslessIntegers: true,
    }
  );

  const verify = () =>
    driver
      .verifyConnectivity()
      .then(() => {
        console.log("Connected!");
        process.exit();
      })
      .catch((err) => {
        console.log("Awaiting connection!");
        setTimeout(verify, 5000);
      });

  verify();
}
