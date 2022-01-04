const router = require("express").Router();
const neo4jDriver = require("../config/neo4jDriver");

router.get("/", async (req, res) => {
    const id = req.user._id

    const session = neo4jDriver.session();

      session
        .run(
          "MATCH (u:User {sessionUserID: $sessionUserID}) RETURN u",
          {
            sessionUserID: id.toString()
          }
        )
        .subscribe({
          onNext: (record) => {
            const recordFull = record.get("u");

            return res.status(200).json({
                user: {
                    ...recordFull.properties,
                    sessionUserID: undefined
                },
                message: "apiUserDataSuccess"
            });
          },
          onCompleted: () => {
            session.close();
          },
          onError: (error) => {
            session.close();
            return res.status(500).json({ message: "apiServerError" });
          },
        });
})

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