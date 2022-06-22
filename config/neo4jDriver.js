const neo4j = require("neo4j-driver");
const logger = require("./logger");

const username = process.env.NEO4J_USERNAME;
const password = process.env.NEO4J_PASSWORD;
const host = process.env.NEO4J_HOST || "localhost";
const port =
  process.env.RUN_TEST == 1
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
      logger.info("Connected to Neo4J");
      const session = driver.session();
      session
        .run(
          `MERGE (p:Util:PostCounter) ON CREATE SET p.next=$next
        MERGE (m:Util:MessageCounter) ON CREATE SET m.next=$next
        MERGE (u:Util:UserCounter) ON CREATE SET u.next=$next
        MERGE (c:Util:ConversationCounter) ON CREATE SET c.next=$next
        MERGE (cc:Util:CommentCounter) ON CREATE SET cc.next=$next
        MERGE (a:Util:AvatarCounter) ON CREATE SET a.next=$next
        MERGE (pc:Util:PictureCounter) ON CREATE SET pc.next=$next
        RETURN p,m,u,c,cc,a,pc`,
          {
            next: neo4j.int(0),
          }
        )
        .then((result) => {
          if (result.summary.counters._stats.nodesCreated) {
            logger.info("Created Counters");
          }
        })
        .finally(() => session.close());
    })
    .catch((error) => {
      logger.error("Can't connect to Neo4J\n", error);
      setTimeout(verify, 5000);
    });
verify();

module.exports = driver;
