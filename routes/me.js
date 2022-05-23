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
    "MATCH (u1:User {sessionUserID: $sessionUserID})-[r:PENDING|FRIEND]-(u2:User) OPTIONAL MATCH (u1)-[:JOINED]->(c:Conversation)<-[:JOINED]-(u2) OPTIONAL MATCH (u1)-[r2:UNREAD]->(c)<-[:JOINED]-(u2) RETURN u2, r, c, r2",
    {
      sessionUserID: id.toString(),
    }
  )
    .then(({ records }) => {
      const result = records.reduce(
        (result, record) => {
          const { u2, r, c, r2 } = record.toObject();
          const user = u2.properties;
          user.sessionUserID = undefined;

          if (r.type === "FRIEND") {
            user.idConversation = c.properties.id;
            user.unreadConversation = !!r2;
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
    }
    OPTIONAL MATCH (pic:Picture)-[:ATTACHED]->(p) WITH p, u, collect(pic) as pic
    OPTIONAL MATCH (c:Comment)-[:UNDER]->(p) WITH p, u, pic, count(c) as c
    OPTIONAL MATCH (p)<-[:LIKED]-(u2:User) WITH p, u, pic, c, collect(u2) AS u2l
    RETURN p, u, size(u2l) AS l, u IN u2l AS lm, c, pic ORDER BY p.date DESC LIMIT 15`,
    { sessionUserID, id }
  )
    .then(({ records }) => {
      const posts = records.map((record) => {
        const post = record.get("p").properties;
        const user = record.get("u").properties;
        user.sessionUserID = undefined;
        post.user = user;

        post.likes = record.get("l");
        post.likesMe = record.get("lm");
        post.comments = record.get("c");

        post.pictures = record.get("pic").map((pic) => pic.properties.picture);

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
    `MATCH (u:User)-[:POSTED]->(p:Post)<-[:LIKED]-(:User{sessionUserID:$sessionUserID})
    OPTIONAL MATCH (pic:Picture)-[:ATTACHED]->(p) WITH p, u, collect(pic) AS pic
    OPTIONAL MATCH (c:Comment)-[:UNDER]->(p) WITH p, u, pic, count(c) AS c
    OPTIONAL MATCH (p)<-[:LIKED]-(u2:User) WITH p, u, pic, c, count(u2) as l
    RETURN p, u, l, pic, c ORDER BY p.date DESC`,
    { sessionUserID }
  )
    .then(({ records }) => {
      const posts = records.map((record) => {
        const post = record.get("p").properties;
        const user = record.get("u").properties;
        user.sessionUserID = undefined;
        post.user = user;

        post.likes = record.get("l");
        post.comments = record.get("c");
        post.pictures = record.get("pic").map((pic) => pic.properties.picture);

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
    "MATCH (u: User {sessionUserID: $sessionUserID})-[r:UPLOADED]->(p:Picture) WHERE NOT (p)-[:ATTACHED]->(:Post) RETURN p",
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

router.get("/all-pictures", (req, res, next) => {
  const id = req.user._id;

  neo4jQueryWrapper(
    "MATCH (u: User {sessionUserID: $sessionUserID})-[]->(p:Picture) RETURN p",
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
    "UNWIND $pictures as picture WITH picture, $dirPrefix + randomUUID() + picture.dirSuffix AS dir MATCH (pc:PictureCounter), (u:User {sessionUserID: $sessionUserID}) CALL apoc.atomic.add(pc,'next',1) YIELD oldValue AS next MERGE (u)-[r:UPLOADED]->(p:Picture {id: next, picture: dir, private: picture.private}) RETURN p ORDER BY p.date DESC",
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
    `WITH $dirPrefix + randomUUID() + $dirSuffix AS avatar
    MATCH (ac:AvatarCounter), (u:User {sessionUserID: $sessionUserID})
    CALL apoc.atomic.add(ac,'next',1) YIELD oldValue AS next
    MERGE (u)-[r:UPLOADED]->(a:Avatar {id: next, avatar: avatar})
    SET u.avatar = avatar
    WITH u,a
    OPTIONAL MATCH (u)-[:UPLOADED]->(aa:Avatar)
    WHERE aa.id <> a.id
    WITH u,a, aa, properties(aa) AS avatarOld
    DETACH DELETE aa
    RETURN u,a, avatarOld`,
    {
      sessionUserID: userId.toString(),
      dirPrefix,
      dirSuffix: `-${filename}`,
    }
  )
    .then(({ records: [record] }) => {
      const avatarNode = record.get("a").properties;
      const avatarOld = record.get("avatarOld");
      const user = record.get("u").properties;
      user.sessionUserID = undefined;

      saveBase64Picture(avatarNode.avatar, avatar);

      if (avatarOld) {
        return fs.rm(avatarOld.avatar.slice(1)).then(() => user);
      }

      return user;
    })
    .then((user) =>
      res.status(200).json({
        user,
        message: "apiMyAvatarSuccess",
      })
    )
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
    `MATCH (u:User {sessionUserID: $sessionUserID})-[:UPLOADED]->(a:Avatar)
    WITH u,a, properties(a) AS aa
    DETACH DELETE a
    SET u.avatar=$default
    RETURN u,aa`,
    {
      sessionUserID,
      default: `/${picturesDir}/${avatarDefault}`,
    }
  )
    .then(({ records: [record] }) => {
      if (!record) {
        throw new NotFoundError("apiMyAvatarDeleteError");
      }

      const { avatar } = record.get("u").properties;
      const { avatar: avatarOld } = record.get("aa");

      return fs.rm(avatarOld.slice(1)).then(() => {
        res.status(200).json({
          avatar,
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
      const chats = records.map((record) => {
        let user = record.get("u2").properties;
        user.sessionUserID = undefined;

        return user;
      });

      return res.status(200).json({
        message: "apiChatsFetchSuccess",
        chats,
      });
    })
    .catch((err) => next(err));
});

router.delete("/picture/:id", (req, res, next) => {
  const sessionUserID = req.user._id.toString();
  const id = isNaN(req.params.id) ? undefined : parseInt(req.params.id);

  if (!id) throw new NotFoundError("apiMyPictureDeleteError");

  neo4jQueryWrapper(
    "MATCH (:User {sessionUserID: $sessionUserID})-[:UPLOADED]->(p:Picture {id: $id}) WITH p, properties(p) AS pp WHERE NOT (p)-[:ATTACHED]->(:Post) DETACH DELETE p RETURN pp",
    { sessionUserID, id }
  )
    .then(({ records: [record] }) => {
      if (!record) {
        throw new NotFoundError("apiMyPictureDeleteError");
      }

      const picture = record.get("pp").picture;

      return fs.rm(picture.slice(1)).then(() => {
        res.status(200).json({
          message: "apiMyPictureDeleteSuccess",
        });
      });
    })
    .catch((err) => next(err));
});

module.exports = router;
