const router = require("express").Router();
const neo4jDriver = require("../config/neo4jDriver");

router.get("/:id", async (req, res) => {
  const id = req.params.id;
  let user = undefined;

  const session = neo4jDriver.session();
  session
    .run("MATCH (u:User {id: $id}) RETURN u", {
      id,
    })
    .subscribe({
      onNext: (record) => {
        const recordFull = record.get("u");

        user = recordFull.properties;
        user.sessionUserID = undefined;
      },
      onCompleted: () => {
        session.close();
        if (user) {
          return res.status(200).json({
            user,
            message: "apiUserFoundSuccess",
          });
        } else {
          return res.status(404).json({ message: "apiUserNotFoundError" });
        }
      },
      onError: (error) => {
        session.close();
        return res.status(500).json({ message: "apiServerError" });
      },
    });
});

router.get("/:id/post", async (req, res) => {
  const id = req.params.id;

  return res.status(200).json({
    posts: [],
    message: "apiUserPostsSuccess",
  });
});

router.post("/:id/friend", async (req, res) => {
  const idSource = req.user._id;
  const idTarget = req.params.id;
  let result = false;

  const session = neo4jDriver.session();
  session
    .run(
      "MATCH (u1:User{sessionUserID: $sessionUserID}) MATCH (u2:User{id: $id}) WHERE NOT exists((u1)-[:PENDING|FRIEND]-(u2)) MERGE (u1)-[p:PENDING]-(u2) RETURN u1,p,u2",
      {
        sessionUserID: idSource.toString(),
        id: idTarget,
      }
    )
    .subscribe({
      onNext: (record) => {
        result = true;
      },
      onCompleted: () => {
        session.close();
        if (result) {
          return res.status(201).json({
            message: "apiFriendPendingSuccess",
          });
        } else {
          return res.status(400).json({ message: "apiFriendPendingError" });
        }
      },
      onError: (error) => {
        session.close();
        return res.status(500).json({ message: "apiServerError" });
      },
    });
});

router.post("/:id/accept", async (req, res) => {
  const idSource = req.user._id;
  const idTarget = req.params.id;
  let result = false;

  const session = neo4jDriver.session();
  session
    .run(
      "MATCH (u1:User{sessionUserID: $sessionUserID})<-[p:PENDING]-(u2:User{id: $id}) DELETE p MERGE (u1)-[f:FRIEND]-(u2) RETURN u1,f,u2",
      {
        sessionUserID: idSource.toString(),
        id: idTarget,
      }
    )
    .subscribe({
      onNext: (record) => {
        result = true;
      },
      onCompleted: () => {
        session.close();
        if (result) {
          return res.status(201).json({
            message: "apiFriendAcceptSuccess",
          });
        } else {
          return res.status(400).json({ message: "apiFriendAcceptError" });
        }
      },
      onError: (error) => {
        session.close();
        return res.status(500).json({ message: "apiServerError" });
      },
    });
});

router.delete("/:id/friend", async (req, res) => {
  const idSource = req.user._id;
  const idTarget = req.params.id;
  let result = false;

  const session = neo4jDriver.session();
  session
    .run(
      "MATCH (u1:User{sessionUserID: $sessionUserID})-[r:PENDING|FRIEND]-(u2:User{id: $id}) DELETE r RETURN u1,u2",
      {
        sessionUserID: idSource.toString(),
        id: idTarget,
      }
    )
    .subscribe({
      onNext: (record) => {
        result = true;
      },
      onCompleted: () => {
        session.close();
        if (result) {
          return res.status(200).json({
            message: "apiFriendRemoveSuccess",
          });
        } else {
          return res.status(400).json({ message: "apiFriendRemoveError" });
        }
      },
      onError: (error) => {
        session.close();
        return res.status(500).json({ message: "apiServerError" });
      },
    });
});

router.get("/:id/picture", async (req, res) => {
  const id = req.params.id;

  return res.status(200).json({
    pictures: [],
    message: "apiUserPicturesSuccess",
  });
});

router.get("/", async (req, res) => {
  const users = [];

  const session = neo4jDriver.session();
  session.run("MATCH (u:User) RETURN u").subscribe({
    onNext: (record) => {
      const recordFull = record.get("u");

      const properties = recordFull.properties;
      properties.sessionUserID = undefined;

      users.push(properties);
    },
    onCompleted: () => {
      session.close();
      return res.status(200).json({
        users,
        message: "apiUsersSuccess",
      });
    },
    onError: (error) => {
      session.close();
      return res.status(500).json({ message: "apiServerError" });
    },
  });
});

module.exports = router;
