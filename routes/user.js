const router = require("express").Router();
const { NotFoundError, FriendError } = require("../utils/errors");
const { parseIdParam, parseIdQuery } = require("../utils/middlewares");
const { neo4jQueryWrapper } = require("../utils/utils");

router.get("/:id", parseIdParam, (req, res, next) => {
  const id = req.params.id;

  neo4jQueryWrapper("MATCH (u:User {id: $id}) RETURN u", {
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
    .catch((err) => next(err));
});

router.get("/:id/post", parseIdParam, parseIdQuery, (req, res, next) => {
  const { id } = req.params;
  const sessionUserID = req.user._id.toString();
  const { id: idPost } = req.query;

  neo4jQueryWrapper(
    `MATCH (u:User{id:$id}) OPTIONAL MATCH (p:Post)<-[:POSTED]-(u) WHERE (p.type=$typePublic OR (p.type=$typeFriends AND (u.sessionUserID=$sessionUserID OR (u)-[:FRIEND]-(:User{sessionUserID:$sessionUserID})))) ${
      idPost !== undefined ? "AND p.id < $idPost" : ""
    } OPTIONAL MATCH (p)<-[:LIKED]-(u2:User) RETURN u, p, collect(u2) AS l ORDER BY p.date DESC LIMIT 15`,
    {
      id,
      typePublic: "public",
      typeFriends: "friends",
      sessionUserID,
      idPost,
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
    .catch((err) => next(err));
});

router.post("/:id/friend", parseIdParam, (req, res, next) => {
  const idSource = req.user._id;
  const idTarget = req.params.id;

  neo4jQueryWrapper(
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
    .catch((err) => next(err));
});

router.post("/:id/accept", parseIdParam, (req, res, next) => {
  const idSource = req.user._id;
  const idTargetUser = req.params.id;

  neo4jQueryWrapper(
    "MATCH (cc:ConversationCounter), (u1:User{sessionUserID: $sessionUserID})<-[p:PENDING]-(u2:User{id: $idTargetUser}) CALL apoc.atomic.add(cc,'next',1) YIELD oldValue AS next DELETE p MERGE (u1)-[f:FRIEND]-(u2) MERGE (u1)-[:JOINED]->(c:Conversation {id: next, active: $active, creationDate: datetime()})<-[:JOINED]-(u2) RETURN u1,f,u2",
    {
      sessionUserID: idSource.toString(),
      idTargetUser,
      active: true,
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
    .catch((err) => next(err));
});

router.delete("/:id/friend", parseIdParam, (req, res, next) => {
  const idSource = req.user._id;
  const idTarget = req.params.id;

  neo4jQueryWrapper(
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
    .catch((err) => next(err));
});

router.get("/:id/picture", parseIdParam, (req, res, next) => {
  const id = req.params.id;

  neo4jQueryWrapper(
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
    .catch((err) => next(err));
});

router.get("/", (req, res, next) => {
  const sessionUserID = req.user._id.toString();
  const namePart = (req.query.namePart ?? "").toLowerCase();

  neo4jQueryWrapper(
    `MATCH (u:User) ${
      namePart.length
        ? "WITH u, toLower(u.nameFirst) AS nf, toLower(u.nameLast) AS nl WHERE NOT u.sessionUserID=$sessionUserID AND (nf+' '+nl STARTS WITH $namePart OR nl STARTS WITH $namePart OR nf STARTS WITH $namePart)"
        : ""
    } RETURN u ORDER BY nf, nl, rand() LIMIT 15`,
    { namePart, sessionUserID }
  )
    .then(({ records }) => {
      const users = records.map((record) => {
        const user = record.get(record.keys[0]).properties;
        user.sessionUserID = undefined;
        return user;
      });
      res.status(200).json({
        payload: users,
        message: "apiUsersSuccess",
      });
    })
    .catch((err) => next(err));
});

module.exports = router;
