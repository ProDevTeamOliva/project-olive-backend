const router = require("express").Router();
const { NotFoundError, FriendError } = require("../utils/errors");
const { parseIdParam, parseIdQuery } = require("../utils/middlewares");
const { neo4jQueryWrapper } = require("../utils/utils");
const sio = require("../config/socket");

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
    `MATCH (u:User{id:$id}), (u1:User{sessionUserID:$sessionUserID})OPTIONAL MATCH (p:Post)<-[:POSTED]-(u) WHERE (p.type=$typePublic OR (p.type=$typeFriends AND (u=u1 OR (u)-[:FRIEND]-(u1)))) ${
      idPost !== undefined ? "AND p.id < $idPost" : ""
    }
    OPTIONAL MATCH (pic:Picture)-[:ATTACHED]->(p) WITH u, u1, p, collect(pic) as pic
    OPTIONAL MATCH (c:Comment)-[:UNDER]->(p) WITH u, u1, p, pic, count(c) AS c
    OPTIONAL MATCH (p)<-[:LIKED]-(u2:User) WITH u, u1, p, pic, c, collect(u2) AS u2l
    RETURN u, p, size(u2l) AS l, u1 IN u2l AS lm, c, pic ORDER BY p.date DESC LIMIT 15`,
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

          post.likes = record.get("l");
          post.likesMe = record.get("lm");
          post.comments = record.get("c");

          post.pictures = record
            .get("pic")
            .map((pic) => pic.properties.picture);

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
  const idSource = req.user._id.toString();
  const idTarget = req.params.id;

  neo4jQueryWrapper(
    "MATCH (u1:User{sessionUserID: $sessionUserID}) MATCH (u2:User{id: $id}) WHERE NOT EXISTS((u1)-[:PENDING|FRIEND]-(u2)) AND u1.id <> u2.id MERGE (u1)-[p:PENDING]->(u2) RETURN u1, p, u2",
    {
      sessionUserID: idSource,
      id: idTarget,
    }
  )
    .then(({ records: [record] }) => {
      if (!record) {
        throw new FriendError("apiFriendPendingError");
      }

      const userId = record.get(record.keys[0]).properties?.id;

      sio.of(`/user/${userId}`).emit("friendPendingSuccess");
      sio.of(`/user/${idTarget}`).emit("friendPendingSuccess");

      res.status(201).json({
        message: "apiFriendPendingSuccess",
      });
    })
    .catch((err) => next(err));
});

router.post("/:id/accept", parseIdParam, (req, res, next) => {
  const idSource = req.user._id.toString();
  const idTargetUser = req.params.id;

  neo4jQueryWrapper(
    "MATCH (u1:User{sessionUserID: $sessionUserID})<-[p:PENDING]-(u2:User {id: $idTargetUser}) WHERE u1.id <> u2.id DELETE p MERGE (u1)-[f:FRIEND]-(u2) WITH u1, f, u2 CALL apoc.do.when(EXISTS((u1)-[:JOINED]->(:Conversation)<-[:JOINED]-(u2)), 'RETURN u1, f, u2', 'MATCH (cc:ConversationCounter) CALL apoc.atomic.add(cc, \"next\", 1) YIELD oldValue AS next MERGE (u1)-[:JOINED]->(c:Conversation {id: next, active: true, creationDate: datetime()})<-[:JOINED]-(u2) RETURN u1, f, u2', {u1: u1, f: f, u2: u2}) YIELD value RETURN u1, f, u2",
    {
      sessionUserID: idSource,
      idTargetUser,
    }
  )
    .then(({ records: [record] }) => {
      if (!record) {
        throw new FriendError("apiFriendAcceptError");
      }

      const userId = record.get(record.keys[0]).properties?.id;

      sio.of(`/user/${userId}`).emit("friendAcceptSuccess");
      sio.of(`/user/${idTargetUser}`).emit("friendAcceptSuccess");

      res.status(201).json({
        message: "apiFriendAcceptSuccess",
      });
    })
    .catch((err) => next(err));
});

router.delete("/:id/friend", parseIdParam, (req, res, next) => {
  const idSource = req.user._id.toString();
  const idTarget = req.params.id;

  neo4jQueryWrapper(
    "MATCH (u1:User{sessionUserID: $sessionUserID})-[r:PENDING|FRIEND]-(u2:User{id: $id}) WHERE u1.id <> u2.id DELETE r RETURN u1, u2",
    {
      sessionUserID: idSource,
      id: idTarget,
    }
  )
    .then(({ records: [record] }) => {
      if (!record) {
        throw new FriendError("apiFriendRemoveError");
      }

      const userId = record.get(record.keys[0]).properties?.id;

      sio.of(`/user/${userId}`).emit("friendRemoveSuccess");
      sio.of(`/user/${idTarget}`).emit("friendRemoveSuccess");

      res.status(200).json({
        message: "apiFriendRemoveSuccess",
      });
    })
    .catch((err) => next(err));
});

router.get("/:id/picture", parseIdParam, (req, res, next) => {
  const id = req.params.id;

  neo4jQueryWrapper(
    "MATCH (u:User {id: $id}) OPTIONAL MATCH (u)-[:UPLOADED]->(p: Picture {private: $private}) WHERE NOT (p)-[:ATTACHED]->(:Post) RETURN p",
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

router.get("/:id/all-pictures", (req, res, next) => {
  const id = req.params.id;

  neo4jQueryWrapper(
    "MATCH (u:User {id: $id}) OPTIONAL MATCH (u)-[]->(p: Picture {private: $private}) RETURN p",
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
    `MATCH (u:User)
    WITH u, toLower(u.nameFirst) AS nf, toLower(u.nameLast) AS nl ${
      namePart.length
        ? "WHERE NOT u.sessionUserID=$sessionUserID AND (nf+' '+nl STARTS WITH $namePart OR nl STARTS WITH $namePart OR nf STARTS WITH $namePart)"
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
