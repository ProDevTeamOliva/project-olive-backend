const router = require("express").Router();
const neo4jDriver = require("../config/neo4jDriver");

router.get("/", async (req, res) => {
  const id = req.user._id;

  const session = neo4jDriver.session();
  session
    .run("MATCH (u:User {sessionUserID: $sessionUserID}) RETURN u", {
      sessionUserID: id.toString(),
    })
    .subscribe({
      onNext: (record) => {
        const recordFull = record.get("u");

        const user = recordFull.properties;
        user.sessionUserID = undefined;

        return res.status(200).json({
          user,
          message: "apiMyDataSuccess",
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
});

router.get("/friend", async (req, res) => {
  return res.status(200).json({
    users: [],
    message: "apiMyFriendsSuccess",
  });
});

router.get("/post", async (req, res) => {
  return res.status(200).json({
    posts: [],
    message: "apiMyPostsSuccess",
  });
});

router.get("/picture", async (req, res) => {
  return res.status(200).json({
    pictures: [],
    message: "apiMyPicturesSuccess",
  });
});

module.exports = router;
