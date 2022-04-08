const router = require("express").Router();
const {
  saveBase64Picture,
  neo4jQueryWrapper,
  validateFields,
} = require("../utils/utils.js");
const { v4: uuidv4 } = require("uuid");

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
    "MATCH (u1:User {sessionUserID: $sessionUserID})-[r:PENDING|FRIEND]-(u2:User) RETURN u2,r",
    {
      sessionUserID: id.toString(),
    }
  )
    .then(({ records }) => {
      const result = records.reduce(
        (result, record) => {
          const { u2, r } = record.toObject();
          const user = u2.properties;
          user.sessionUserID = undefined;

          if (r.type === "FRIEND") {
            result.friends.push(user);
          } else if (r.type === "PENDING") {
            const u2Identity = u2.identity;

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

router.get("/post", (req, res, next) => {
  const sessionUserID = req.user._id.toString();

  neo4jQueryWrapper(
    "MATCH (p:Post)<-[:POSTED]-(u:User{sessionUserID:$sessionUserID}) optional match (p)<-[:LIKED]-(u2:User) RETURN p, u, collect(u2) as l order by p.date desc",
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

  const picturesParsed = pictures.map((element) => {
    const id = uuidv4();

    return {
      id,
      picture: `/public/pictures/${id}-${element.filename}`,
      private: element.private,
      base64: element.picture,
    };
  });

  neo4jQueryWrapper(
    "UNWIND $pictures as picture MATCH (u:User {sessionUserID: $sessionUserID}) MERGE (u)-[r:UPLOADED]->(p:Picture:ID {id: picture.id, picture: picture.picture, private: picture.private}) RETURN p",
    {
      sessionUserID: id.toString(),
      pictures: picturesParsed,
    }
  )
    .then(({ records }) => {
      records.forEach((record) => {
        const pictureNode = record.get("p").properties;
        const picture = picturesParsed.filter(
          (pic) => pic.id === pictureNode.id
        )[0];
        saveBase64Picture(picture.picture, picture.base64);
      });

      res.status(200).json({
        pictures: picturesParsed.map((picture) => ({
          id: picture.id,
          picture: picture.picture,
          private: picture.private,
        })),
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

  const picId = uuidv4();

  const avatarParsed = {
    id: picId,
    picture: `/public/pictures/${picId}-${filename}`,
    base64: avatar,
  };

  neo4jQueryWrapper(
    "MATCH (u:User {sessionUserID: $sessionUserID}) MERGE (u)-[r:UPLOADED]->(a:Avatar:ID {id: $avatar.id, avatar: $avatar.picture}) SET u.avatar = $avatar.picture RETURN u",
    {
      sessionUserID: userId.toString(),
      avatar: avatarParsed,
    }
  )
    .then(({ records: [record] }) => {
      const user = record.get("u").properties;
      user.sessionUserID = undefined;

      saveBase64Picture(avatarParsed.picture, avatarParsed.base64);

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

module.exports = router;
