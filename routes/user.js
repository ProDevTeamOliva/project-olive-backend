const router = require("express").Router();
const neo4jDriver = require("../config/neo4jDriver");

router.get("/:login", async (req, res) => {
    const login = req.params.login
    let user = undefined

    const session = neo4jDriver.session();
    session
      .run(
        "MATCH (u:User {login: $login}) RETURN u",
        {
          login
        }
      )
      .subscribe({
        onNext: (record) => {
          const recordFull = record.get("u");

          user = recordFull.properties
          user.sessionUserID = undefined

        },
        onCompleted: () => {
          session.close();
          if(user){
            return res.status(200).json({
              user,
              message: "apiUserFoundSuccess"
            });

          } else {
              return res.status(404).json({message: "apiUserNotFoundError"});
          }
        },
        onError: (error) => {
          session.close();
          return res.status(500).json({ message: "apiServerError" });
        },
      });
})

router.get("/", async (req, res) => {
  const users = []

  const session = neo4jDriver.session();
  session
    .run(
      "MATCH (u:User) RETURN u"
    )
    .subscribe({
      onNext: (record) => {
        const recordFull = record.get("u");

        const properties = recordFull.properties
        properties.sessionUserID = undefined

        users.push(properties)
        
      },
      onCompleted: () => {
        session.close();
        return res.status(200).json({
          users,
          message: "apiUsersSuccess"
        });
      },
      onError: (error) => {
        session.close();
        return res.status(500).json({ message: "apiServerError" });
      },
    });
})

module.exports = router;