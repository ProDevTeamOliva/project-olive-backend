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
const { NotFoundError, FriendError } = require("../utils/errors");

router.get("/:id", (req, res, next) => {
  const id = req.params.id;

  const session = neo4jDriver.session();
  session
    .run(userGetById, {
      id,
    })
    .then(({records: [record]}) => {
      if(!record) {
        throw new NotFoundError("apiUserNotFoundError")
      }
      
      const user = record.get(record.keys[0]).properties
      user.sessionUserID = undefined

      res.status(200).json({
        user,
        message: "apiUserFoundSuccess",
      })
    })
    .catch(err => next(err))
    .then(() => session.close())
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

router.post("/:id/friend", (req, res, next) => {
  const idSource = req.user._id;
  const idTarget = req.params.id;

  const session = neo4jDriver.session();
  session
    .run(userFriendPost, {
      sessionUserID: idSource.toString(),
      id: idTarget,
    })
    .then(({records: [record]}) => {
      if(!record) {
        throw new FriendError("apiFriendPendingError")
      }
      res.status(201).json({
        message: "apiFriendPendingSuccess",
      })

    })
    .catch(err => next(err))
    .then(() => session.close())
});

router.post("/:id/accept", (req, res, next) => {
  const idSource = req.user._id;
  const idTarget = req.params.id;

  const session = neo4jDriver.session();
  session
    .run(userAcceptPost, {
      sessionUserID: idSource.toString(),
      id: idTarget,
    })
    .then(({records: [record]}) => {
      if(!record) {
        throw new FriendError("apiFriendAcceptError")
      }
      res.status(201).json({
        message: "apiFriendAcceptSuccess",
      });
    })
    .catch(err => next(err))
    .then(() => session.close())
});

router.delete("/:id/friend", (req, res, next) => {
  const idSource = req.user._id;
  const idTarget = req.params.id;

  const session = neo4jDriver.session();
  session
    .run(userFriendDelete, {
      sessionUserID: idSource.toString(),
      id: idTarget,
    })
    .then(({records: [record]}) => {
      if(!record) {
        throw new FriendError("apiFriendRemoveError")
      }
      res.status(200).json({
        message: "apiFriendRemoveSuccess",
      });
    })
    .catch(err => next(err))
    .then(() => session.close())
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

router.get("/", (req, res, next) => {

  const session = neo4jDriver.session();
  session.run(userGet)
    .then(({records}) => {
      const users = records.map(record => {
        const user = record.get(record.keys[0]).properties
        user.sessionUserID = undefined
        return user
      })
      res.status(200).json({
        users,
        message: "apiUsersSuccess",
      })

    })
    .catch(err => next(err))
    .then(() => session.close())
});

router.get("/search/:value", (req, res, next) => {
  const searchValue = req.params.value.toString();
  const sessionUserID = req.user._id.toString();
  const session = neo4jDriver.session();
  session
    .run(userGetByValue, {
      sessionUserID,
      searchValue,
    })
    .then(({records}) => {
      const users = records.map(record => {
        const user = record.get(record.keys[0]).properties
        user.sessionUserID = undefined
        return user
      })
      res.status(200).json({
        users,
        message: "apiUsersSuccess",
      })

    })
    .catch(err => next(err))
    .then(() => session.close())
});

module.exports = router;
