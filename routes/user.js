const router = require("express").Router();
const neo4jDriver = require("../config/neo4jDriver");
const {
  userGetById,
  userGetPost,
  userGetLikes,
  userFriendPost,
  userAcceptPost,
  userFriendDelete,
  userPictureGet,
  userGet,
  userGetByValue,
} = require("../cypher/requests");

router.get("/:id", async (req, res) => {
  const id = req.params.id;
  let user = undefined;

  const session = neo4jDriver.session();
  session
    .run(userGetById, {
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

  let posts = [];
  let result = false;

  const session = neo4jDriver.session();
  session
    .run(userGetPost, {
      id,
    })
    .subscribe({
      onNext: (record) => {
        result = true;

        const postRecord = record.get("p");
        if (!postRecord) {
          return;
        }
        const post = {
          ...postRecord.properties,
          user: record.get("u").properties,
        };
        post.user.sessionUserID = undefined;

        post.likes = record.get("l").map((l) => {
          const properties = l.properties;
          properties.sessionUserID = undefined;
          return properties;
        });

        posts = [...posts, post];
      },
      onCompleted: () => {
        session.close();

        if (result) {
          return res.status(200).json({
            posts,
            message: "apiUserPostsSuccess",
          });
        } else {
          return res.status(400).json({ message: "apiUserPostsError" });
        }
      },
      onError: (error) => {
        session.close();
        return res.status(500).json({ message: "apiServerError" });
      },
    });
});

router.get("/:id/like", async (req, res) => {
  const id = req.params.id;

  let posts = [];
  let result = false;

  const session = neo4jDriver.session();
  session.run(userGetLikes, { id }).subscribe({
    onNext: (record) => {
      result = true;

      const postRecord = record.get("p");
      if (!postRecord) {
        return;
      }
      const post = {
        ...postRecord.properties,
        user: record.get("u").properties,
      };
      user.sessionUserID = undefined;

      post.likes = record.get("l").map((l) => {
        const properties = l.properties;
        properties.sessionUserID = undefined;
        return properties;
      });

      posts = [...posts, post];
    },
    onCompleted: () => {
      session.close();
      if (result) {
        return res.status(200).json({
          posts,
          message: "apiUserLikedPostsSuccess",
        });
      } else {
        return res.status(400).json({ message: "apiUserLikedPostsError" });
      }
    },
    onError: (error) => {
      session.close();
      return res.status(500).json({ message: "apiServerError" });
    },
  });
});

router.post("/:id/friend", async (req, res) => {
  const idSource = req.user._id;
  const idTarget = req.params.id;
  let result = false;

  const session = neo4jDriver.session();
  session
    .run(userFriendPost, {
      sessionUserID: idSource.toString(),
      id: idTarget,
    })
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
    .run(userAcceptPost, {
      sessionUserID: idSource.toString(),
      id: idTarget,
    })
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
    .run(userFriendDelete, {
      sessionUserID: idSource.toString(),
      id: idTarget,
    })
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

  let pictures = [];

  const session = neo4jDriver.session();
  session
    .run(userPictureGet, {
      id,
    })
    .subscribe({
      onNext: (record) => {
        pictures = [...pictures, record.get("p").properties];
      },
      onCompleted: () => {
        session.close();

        return res.status(200).json({
          pictures,
          message: "apiUserPicturesSuccess",
        });
      },
      onError: (error) => {
        session.close();
        return res.status(500).json({ message: "apiServerError" });
      },
    });
});

router.get("/", async (req, res) => {
  let users = [];

  const session = neo4jDriver.session();
  session.run(userGet).subscribe({
    onNext: (record) => {
      const properties = record.get("u").properties;
      properties.sessionUserID = undefined;

      users = [...users, properties];
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

router.get("/search/:value", async (req, res) => {
  let users = [];
  const searchValue = req.params.value.toString();
  const sessionUserID = req.user._id.toString();
  const session = neo4jDriver.session();
  session
    .run(userGetByValue, {
      sessionUserID,
      searchValue,
    })
    .subscribe({
      onNext: (record) => {
        const properties = record.get("u").properties;
        properties.sessionUserID = undefined;

        users = [...users, properties];
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
