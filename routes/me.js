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
  const id = req.user._id;

  const result = {
    friends: [],
    pendingSent: [],
    pendingReceived: []
  }

  const session = neo4jDriver.session();
  session
    .run("MATCH (u1:User {sessionUserID: $sessionUserID})-[r:PENDING|FRIEND]-(u2:User) RETURN u2,r", {
      sessionUserID: id.toString(),
    })
    .subscribe({
      onNext: (record) => {
        const {u2, r} = record.toObject()
        const user = u2.properties
        user.sessionUserID = undefined

        if(r.type==="FRIEND") {
          result.friends.push(user)

        } else if (r.type==="PENDING") {
          const u2Identity = u2.identity
          if(r.start===u2Identity) {
            result.pendingReceived.push(user)

          } else if (r.end===u2Identity) {
            result.pendingSent.push(user)
          }
        }
      },
      onCompleted: () => {
        session.close();
        return res.status(200).json({
          ...result,
          message: "apiMyFriendsSuccess",
        });
      },
      onError: (error) => {
        session.close();
        return res.status(500).json({ message: "apiServerError" });
      },
    });
});

router.get("/post", async (req, res) => {
  const id = req.user._id;

  return res.status(200).json({
    posts: [],
    message: "apiMyPostsSuccess",
  });
});

router.get("/picture", async (req, res) => {
  const id = req.user._id;

  return res.status(200).json({
    pictures: [],
    message: "apiMyPicturesSuccess",
  });
});

module.exports = router;
