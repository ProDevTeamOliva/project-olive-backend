const router = require("express").Router();
const neo4jDriver = require("../config/neo4jDriver");

router.get("/:login", async (req, res) => {
    const login = req.params.login

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

            const properties = recordFull.properties
            return res.status(200).json({
                user: {
                    nameFirst: properties.nameFirst,
                    login: properties.login
                },
                message: "apiUserFoundSuccess"
            });
          },
          onCompleted: () => {
            session.close();
            if(!res.headersSent) {
                return res.status(404).json({message: "apiUserNotFoundError"});
            }
          },
          onError: (error) => {
            session.close();
            return res.status(500).json({ message: "apiServerError" });
          },
        });
})

module.exports = router;