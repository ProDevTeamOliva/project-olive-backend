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
                ...recordFull.properties,
                sessionUserID: undefined
            });
          },
          onCompleted: () => {
            session.close();
          },
          onError: (error) => {
            session.close();
            SessionUser.findByIdAndDelete(user._id.toString(), () => {
              return res.status(500).json({ message: "apiServerError" });
            });
          },
        });
})

module.exports = router;