const router = require("express").Router();
const neo4jDriver = require("../config/neo4jDriver");
const { NotFoundError, FriendError } = require("../utils/errors");

router.get("/:id", (req, res, next) => {
  const id = req.params.id;

  const session = neo4jDriver.session();
  session
    .run("MATCH (u:User {id: $id}) RETURN u", {
      id,
    })
    .then(({ records: [record] }) => {
      if (!record) {
        throw new NotFoundError("apiUserNotFoundError");
      }

      const user = record.get(record.keys[0]).properties;
      user.sessionUserID = undefined;

      res.status(200).json({
        user,
        message: "apiUserFoundSuccess",
      });
    })
    .catch((err) => next(err))
    .then(() => session.close());
});

router.get("/:id/post", (req, res, next) => {
  const id = req.params.id;

  const session = neo4jDriver.session();
  session
    .run(
      "MATCH (u:User{id:$id}) optional MATCH (p:Post)<-[:POSTED]-(u) optional match (p)<-[:LIKED]-(u2:User) RETURN p, u, collect(u2) as l order by p.date desc",
      {
        id,
      }
    )
    .then(({ records }) => {
      if (!records.length) {
        throw new NotFoundError("apiUserNotFoundError");
      }

      const posts = records.reduce((result, record) => {
        const postNode = record.get("p");
        if (postNode) {
          const post = postNode.properties;
          const user = record.get("u").properties;
          user.sessionUserID = undefined;
          post.user = user;

          post.likes = record.get("l").map((l) => {
            const properties = l.properties;
            properties.sessionUserID = undefined;
            return properties;
          });

          result.push(post);
        }

        return result;
      }, []);

      res.status(200).json({
        message: "apiUserPostsSuccess",
        posts,
      });
    })
    .catch((err) => next(err))
    .then(() => session.close());
});

router.get("/:id/like", (req, res, next) => {
  const id = req.params.id;

  const session = neo4jDriver.session();
  session
    .run(
      "MATCH (u:User{id:$id}) optional match (p:Post)<-[:LIKED]-(u) optional match (p)<-[:LIKED]-(u2:User) RETURN p, u, collect(u2) as l",
      { id }
    )
    .then(({ records }) => {
      if (!records.length) {
        throw new NotFoundError("apiUserNotFoundError");
      }

      const posts = records.reduce((result, record) => {
        const postNode = record.get("p");
        if (postNode) {
          const post = postNode.properties;
          const user = record.get("u").properties;
          user.sessionUserID = undefined;
          post.user = user;

          post.likes = record.get("l").map((l) => {
            const properties = l.properties;
            properties.sessionUserID = undefined;
            return properties;
          });

          result.push(post);
        }

        return result;
      }, []);

      res.status(200).json({
        message: "apiUserLikedPostsSuccess",
        posts,
      });
    })
    .catch((err) => next(err))
    .then(() => session.close());
});

router.post("/:id/friend", (req, res, next) => {
  const idSource = req.user._id;
  const idTarget = req.params.id;

  const session = neo4jDriver.session();
  session
    .run(
      "MATCH (u1:User{sessionUserID: $sessionUserID}) MATCH (u2:User{id: $id}) WHERE NOT exists((u1)-[:PENDING|FRIEND]-(u2)) MERGE (u1)-[p:PENDING]->(u2) RETURN u1,p,u2",
      {
        sessionUserID: idSource.toString(),
        id: idTarget,
      }
    )
    .then(({ records: [record] }) => {
      if (!record) {
        throw new FriendError("apiFriendPendingError");
      }
      res.status(201).json({
        message: "apiFriendPendingSuccess",
      });
    })
    .catch((err) => next(err))
    .then(() => session.close());
});

router.post("/:id/accept", (req, res, next) => {
  const idSource = req.user._id;
  const idTarget = req.params.id;

  const session = neo4jDriver.session();
  session
    .run(
      "MATCH (u1:User{sessionUserID: $sessionUserID})<-[p:PENDING]-(u2:User{id: $id}) DELETE p MERGE (u1)-[f:FRIEND]-(u2) RETURN u1,f,u2",
      {
        sessionUserID: idSource.toString(),
        id: idTarget,
      }
    )
    .then(({ records: [record] }) => {
      if (!record) {
        throw new FriendError("apiFriendAcceptError");
      }
      res.status(201).json({
        message: "apiFriendAcceptSuccess",
      });
    })
    .catch((err) => next(err))
    .then(() => session.close());
});

router.delete("/:id/friend", (req, res, next) => {
  const idSource = req.user._id;
  const idTarget = req.params.id;

  const session = neo4jDriver.session();
  session
    .run(
      "MATCH (u1:User{sessionUserID: $sessionUserID})-[r:PENDING|FRIEND]-(u2:User{id: $id}) DELETE r RETURN u1,u2",
      {
        sessionUserID: idSource.toString(),
        id: idTarget,
      }
    )
    .then(({ records: [record] }) => {
      if (!record) {
        throw new FriendError("apiFriendRemoveError");
      }
      res.status(200).json({
        message: "apiFriendRemoveSuccess",
      });
    })
    .catch((err) => next(err))
    .then(() => session.close());
});

router.get("/:id/picture", (req, res, next) => {
  const id = req.params.id;

  const session = neo4jDriver.session();
  session
    .run(
      "MATCH (u:User {id: $id}) OPTIONAL MATCH (u)-[UPLOADED]->(p: Picture {private: $private}) RETURN p",
      {
        id,
        private: false,
      }
    )
    .then(({ records }) => {
      if (!records.length) {
        throw new NotFoundError("apiUserNotFoundError");
      }

      const pictures = records.reduce((result, record) => {
        const pictureNode = record.get("p");
        if (pictureNode) {
          result.push(pictureNode.properties);
        }
        return result;
      }, []);
      res.status(200).json({
        pictures,
        message: "apiUserPicturesSuccess",
      });
    })
    .catch((err) => next(err))
    .then(() => session.close());
});

router.get("/", (req, res, next) => {
  const session = neo4jDriver.session();
  session
    .run("MATCH (u:User) RETURN u")
    .then(({ records }) => {
      const users = records.map((record) => {
        const user = record.get(record.keys[0]).properties;
        user.sessionUserID = undefined;
        return user;
      });
      res.status(200).json({
        users,
        message: "apiUsersSuccess",
      });
    })
    .catch((err) => next(err))
    .then(() => session.close());
});

router.get("/search/:value", (req, res, next) => {
  const searchValue = req.params.value.toString().toLowerCase();
  const sessionUserID = req.user._id.toString();
  const session = neo4jDriver.session();
  session
    .run(
      "MATCH (u:User ) WHERE (toLower(u.nameFirst) CONTAINS $searchValue OR toLower(u.nameLast) CONTAINS $searchValue) AND NOT u.sessionUserID=$sessionUserID  RETURN u LIMIT 15",
      {
        sessionUserID,
        searchValue,
      }
    )
    .then(({ records }) => {
      const users = records.map((record) => {
        const user = record.get(record.keys[0]).properties;
        user.sessionUserID = undefined;
        return user;
      });
      res.status(200).json({
        users,
        message: "apiUsersSuccess",
      });
    })
    .catch((err) => next(err))
    .then(() => session.close());
});

module.exports = router;
