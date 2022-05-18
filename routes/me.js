const router = require("express").Router();
const {
  saveBase64Picture,
  neo4jQueryWrapper,
  validateFields,
} = require("../utils/utils.js");
const { validatePicturesSize } = require("../utils/validators");
const { parseIdQuery } = require("../utils/middlewares.js");
const { picturesDir, avatarDefault } = require("../utils/constants");
const dirPrefix = `/${picturesDir}/`;
const fs = require("fs/promises");
const { NotFoundError } = require("../utils/errors.js");

router.get("/", (req, res, next) => {
  const id = req.user._id;

  neo4jQueryWrapper("MATCH (u:User {sessionUserID: $sessionUserID}) RETURN u", {
    sessionUserID: id.toString(),
  })
    .then(({ records: [record] }) => {
      const user = record.get(record.keys[0]).properties;
      user.sessionUserID = undefined;

      res.status(200).json({
        user,
        message: "apiMyDataSuccess",
      });
    })
    .catch((err) => next(err));
});

router.get("/friend", (req, res, next) => {
  const id = req.user._id;

  neo4jQueryWrapper(
    "MATCH (u1:User {sessionUserID: $sessionUserID})-[r:PENDING|FRIEND]-(u2:User) OPTIONAL MATCH (u1)-[:JOINED]->(c:Conversation)<-[:JOINED]-(u2) RETURN u2, r, c",
    {
      sessionUserID: id.toString(),
    }
  )
    .then(({ records }) => {
      const result = records.reduce(
        (result, record) => {
          const { u2, r, c } = record.toObject();
          const user = u2.properties;
          user.sessionUserID = undefined;

          if (r.type === "FRIEND") {
            user.idConversation = c.properties.id;
            result.friends.push(user);
          } else if (r.type === "PENDING") {
            const u2Identity = u2.identity;
            user.idConversation = undefined;

            if (r.start === u2Identity) {
              result.pendingReceived.push(user);
            } else if (r.end === u2Identity) {
              result.pendingSent.push(user);
            }
          }

          return result;
        },
        {
          friends: [],
          pendingSent: [],
          pendingReceived: [],
        }
      );

      res.status(200).json({
        ...result,
        message: "apiMyFriendsSuccess",
      });
    })
    .catch((err) => next(err));
});

router.get("/post", parseIdQuery, (req, res, next) => {
  const sessionUserID = req.user._id.toString();
  const { id } = req.query;

  neo4jQueryWrapper(
    `MATCH (p:Post)<-[:POSTED]-(u:User{sessionUserID:$sessionUserID}) ${
      id !== undefined ? "WHERE p.id < $id" : ""
    } OPTIONAL MATCH (p)<-[:LIKED]-(u2:User) RETURN p, u, collect(u2) AS l ORDER BY p.date DESC LIMIT 15`,
    { sessionUserID, id }
  )
    .then(({ records }) => {
      const posts = records.map((record) => {
        const post = record.get("p").properties;
        const user = record.get("u").properties;
        user.sessionUserID = undefined;
        post.user = user;

        post.likes = record.get("l").map((l) => {
          const properties = l.properties;
          properties.sessionUserID = undefined;
          return properties;
        });

        return post;
      });

      res.status(200).json({
        message: "apiMyPostsSuccess",
        posts,
      });
    })
    .catch((err) => next(err));
});

router.get("/like", (req, res, next) => {
  const sessionUserID = req.user._id.toString();

  neo4jQueryWrapper(
    "MATCH (u:User)-[:POSTED]->(p:Post)<-[:LIKED]-(:User{sessionUserID:$sessionUserID}) optional match (p)<-[:LIKED]-(u2:User) RETURN p, u, collect(u2) as l order by p.date desc",
    { sessionUserID }
  )
    .then(({ records }) => {
      const posts = records.map((record) => {
        const post = record.get("p").properties;
        const user = record.get("u").properties;
        user.sessionUserID = undefined;
        post.user = user;

        post.likes = record.get("l").map((l) => {
          const properties = l.properties;
          properties.sessionUserID = undefined;
          return properties;
        });

        return post;
      });

      res.status(200).json({
        message: "apiMyPostsSuccess",
        posts,
      });
    })
    .catch((err) => next(err));
});

router.get("/picture", (req, res, next) => {
  const id = req.user._id;

  neo4jQueryWrapper(
    "MATCH (u: User {sessionUserID: $sessionUserID})-[r:UPLOADED]->(p:Picture) RETURN p",
    {
      sessionUserID: id.toString(),
    }
  )
    .then(({ records }) => {
      const pictures = records.map((record) => {
        const pictureNode = record.get("p").properties;
        return {
          id: pictureNode.id,
          picture: pictureNode.picture,
          private: pictureNode.private,
        };
      });

      res.status(200).json({
        pictures,
        message: "apiMyPicturesSuccess",
      });
    })
    .catch((err) => next(err));
});

router.post("/picture", (req, res, next) => {
  const id = req.user._id;
  const { pictures } = req.body;

  if (!validateFields(next, { pictures })) {
    return;
  }

  if (!validatePicturesSize(next, pictures)) {
    return;
  }

  const picturesParsed = pictures.map((element) => ({
    private: element.private,
    base64: element.picture,
    dirSuffix: `-${element.filename}`,
  }));

  neo4jQueryWrapper(
    "UNWIND $pictures as picture WITH picture, $dirPrefix + randomUUID() + picture.dirSuffix AS dir MATCH (pc:PictureCounter), (u:User {sessionUserID: $sessionUserID}) CALL apoc.atomic.add(pc,'next',1) YIELD oldValue AS next MERGE (u)-[r:UPLOADED]->(p:Picture {id: next, picture: dir, private: picture.private}) RETURN p",
    {
      sessionUserID: id.toString(),
      pictures: picturesParsed,
      dirPrefix,
    }
  )
    .then(({ records }) => {
      const pictures = records.map((record, index) => {
        const pictureNode = record.get("p").properties;
        saveBase64Picture(pictureNode.picture, picturesParsed[index].base64);
        return pictureNode;
      });

      res.status(200).json({
        pictures,
        message: "apiMyPicturesSuccess",
      });
    })
    .catch((err) => next(err));
});

router.patch("/avatar", (req, res, next) => {
  const userId = req.user._id;
  const { filename, avatar } = req.body;

  if (!validateFields(next, { filename, avatar })) {
    return;
  }

  neo4jQueryWrapper(
    "WITH $dirPrefix + randomUUID() + $dirSuffix AS avatar MATCH (ac:AvatarCounter), (u:User {sessionUserID: $sessionUserID}) CALL apoc.atomic.add(ac,'next',1) YIELD oldValue AS next MERGE (u)-[r:UPLOADED]->(a:Avatar {id: next, avatar: avatar}) SET u.avatar = avatar RETURN u,a",
    {
      sessionUserID: userId.toString(),
      dirPrefix,
      dirSuffix: `-${filename}`,
    }
  )
    .then(({ records: [record] }) => {
      const avatarNode = record.get("a").properties;
      const user = record.get("u").properties;
      user.sessionUserID = undefined;

      saveBase64Picture(avatarNode.avatar, avatar);

      res.status(200).json({
        user,
        message: "apiMyAvatarSuccess",
      });
    })
    .catch((err) => next(err));
});

router.get("/avatar", (req, res, next) => {
  const userId = req.user._id;

  neo4jQueryWrapper("MATCH (u:User {sessionUserID: $sessionUserID}) RETURN u", {
    sessionUserID: userId.toString(),
  })
    .then(({ records: [record] }) => {
      const userData = record.get("u").properties;
      const avatar = userData.avatar;

      res.status(200).json({
        avatar,
        message: "apiMyAvatarSuccess",
      });
    })
    .catch((err) => next(err));
});

router.delete("/avatar", (req, res, next) => {
  const sessionUserID = req.user._id.toString();

  neo4jQueryWrapper(
    "MATCH (u:User {sessionUserID: $sessionUserID})-[:UPLOADED]->(a:Avatar) WITH u, a, properties(a) AS aa DETACH DELETE a SET u.avatar=$default RETURN aa",
    {
      sessionUserID,
      default: `/${picturesDir}/${avatarDefault}`,
    }
  )
    .then(({ records: [record] }) => {
      if (!record) {
        throw new NotFoundError("apiMyAvatarDeleteError");
      }

      const { avatar } = record.get("aa");

      return fs.rm(avatar.slice(1)).then(() => {
        res.status(200).json({
          avatar: avatar,
          message: "apiMyAvatarDeleteSuccess",
        });
      });
    })
    .catch((err) => next(err));
});

router.get("/unread-chats", (req, res, next) => {
  const sessionUserID = req.user._id.toString();

  neo4jQueryWrapper(
    "MATCH (u:User {sessionUserID: $sessionUserID})-[:UNREAD]->(c:Conversation), (u)-[:JOINED]->(c), (u2:User)-[:JOINED]->(c) RETURN u2",
    { sessionUserID }
  )
    .then(({ records }) => {
      const chats = records.map(record => {
        let user = record.get("u2").properties;
        user.sessionUserID = undefined;

        return user;
      });

      return res.status(200).json({
        message: "apiChatsFetchSuccess",
        chats
      });
    })
    .catch((err) => next(err));
});

module.exports = router;
