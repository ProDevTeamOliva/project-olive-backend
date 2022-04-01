const router = require("express").Router();
const neo4jDriver = require("../config/neo4jDriver");
const { saveBase64Picture } = require("../utils/utils.js");
const { v4: uuidv4 } = require("uuid");
const {
  meGet,
  meFriendGet,
  mePostGet,
  meLikeGet,
  mePictureGet,
  mePicturePost,
  meAvatarGet,
  meAvatarPatch,
} = require("../cypher/requests");

router.get("/", (req, res, next) => {
  const id = req.user._id;

  const session = neo4jDriver.session();
  session
    .run(meGet, {
      sessionUserID: id.toString(),
    })
    .then(({records: [record]}) => {
      const user = record.get(record.keys[0]).properties
      user.sessionUserID = undefined

      res.status(200).json({
        user,
        message: "apiMyDataSuccess",
      })
    })
    .catch(err => next(err))
    .then(() => session.close())
});

router.get("/friend", (req, res, next) => {
  const id = req.user._id;

  const session = neo4jDriver.session();
  session
    .run(meFriendGet, {
      sessionUserID: id.toString(),
    })
    .then(({records}) => {
      const result = records.reduce((result, record) => {
        const {u2, r} = record.toObject()
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

        return result

      }, {
        friends: [],
        pendingSent: [],
        pendingReceived: [],
      })

      res.status(200).json({
        ...result,
        message: "apiMyFriendsSuccess",
      })
    })
    .catch(err => next(err))
    .then(() => session.close())
});

router.get("/post", async (req, res) => {
  const sessionUserID = req.user._id.toString();

  const posts = [];

  const session = neo4jDriver.session();
  session.run(mePostGet, { sessionUserID }).subscribe({
    onNext: (record) => {
      const post = record.get("p").properties;
      const user = record.get("u").properties;
      user.sessionUserID = undefined;
      post.user = user;

      post.likes = record.get("l").map((l) => {
        const properties = l.properties;
        properties.sessionUserID = undefined;
        return properties;
      });

      posts.push(post);
    },
    onCompleted: () => {
      session.close();

      return res.status(200).json({
        posts,
        message: "apiMyPostsSuccess",
      });
    },
    onError: (error) => {
      session.close();
      return res.status(500).json({ message: "apiServerError" });
    },
  });
});

router.get("/like", async (req, res) => {
  const sessionUserID = req.user._id.toString();

  const posts = [];

  const session = neo4jDriver.session();
  session.run(meLikeGet, { sessionUserID }).subscribe({
    onNext: (record) => {
      const post = record.get("p").properties;
      const user = record.get("u").properties;
      user.sessionUserID = undefined;
      post.user = user;

      post.likes = record.get("l").map((l) => {
        const properties = l.properties;
        properties.sessionUserID = undefined;
        return properties;
      });

      posts.push(post);
    },
    onCompleted: () => {
      session.close();

      return res.status(200).json({
        posts,
        message: "apiMyPostsSuccess",
      });
    },
    onError: (error) => {
      session.close();
      return res.status(500).json({ message: "apiServerError" });
    },
  });
});

router.get("/picture", async (req, res) => {
  const id = req.user._id;

  let pictures = [];

  const session = neo4jDriver.session();
  session
    .run(mePictureGet, {
      sessionUserID: id.toString(),
    })
    .subscribe({
      onNext: (record) => {
        const pictureNode = record.get("p").properties;

        pictures = [
          ...pictures,
          {
            id: pictureNode.id,
            picture: pictureNode.picture,
            private: pictureNode.private,
          },
        ];
      },
      onCompleted: () => {
        session.close();

        return res.status(200).json({
          pictures,
          message: "apiMyPicturesSuccess",
        });
      },
      onError: (error) => {
        session.close();
        console.log(error);
        return res.status(500).json({ message: "apiServerError" });
      },
    });
});

router.post("/picture", async (req, res) => {
  const id = req.user._id;

  const pictures = req.body.pictures.map((element) => {
    const id = uuidv4();

    return {
      id,
      picture: `/public/pictures/${id}-${element.filename}`,
      private: element.private,
      base64: element.picture,
    };
  });

  const session = neo4jDriver.session();

  session
    .run(mePicturePost, {
      sessionUserID: id.toString(),
      pictures: pictures,
    })
    .subscribe({
      onNext: (record) => {
        const pictureNode = record.get("p").properties;

        const picture = pictures.filter((pic) => pic.id === pictureNode.id)[0];

        saveBase64Picture(picture.picture, picture.base64);
      },
      onCompleted: () => {
        session.close();

        return res.status(200).json({
          pictures: pictures.map((picture) => {
            return {
              id: picture.id,
              picture: picture.picture,
              private: picture.private,
            };
          }),
          message: "apiMyPicturesSuccess",
        });
      },
      onError: (error) => {
        session.close();
        console.log(error);
        return res.status(500).json({ message: "apiServerError" });
      },
    });
});

router.patch("/avatar", async (req, res) => {
  const userId = req.user._id;
  const picId = uuidv4();

  const reqAvatar = req.body;

  const avatar = {
    id: picId,
    picture: `/public/pictures/${picId}-${reqAvatar.filename}`,
    base64: reqAvatar.avatar,
  };

  const session = neo4jDriver.session();

  let user = {};

  session
    .run(meAvatarPatch, {
      sessionUserID: userId.toString(),
      avatar: avatar,
    })
    .subscribe({
      onNext: (record) => {
        user = record.get("u").properties;

        saveBase64Picture(avatar.picture, avatar.base64);
      },
      onCompleted: () => {
        session.close();

        return res.status(200).json({
          user,
          message: "apiMyAvatarSuccess",
        });
      },
      onError: (error) => {
        session.close();
        console.log(error);
        return res.status(500).json({ message: "apiServerError" });
      },
    });
});

router.get("/avatar", async (req, res) => {
  const userId = req.user._id;

  const session = neo4jDriver.session();

  let avatar = "";

  session
    .run(meAvatarGet, {
      sessionUserID: userId.toString(),
    })
    .subscribe({
      onNext: (record) => {
        const userData = record.get("u").properties;

        avatar = userData.avatar;
      },
      onCompleted: () => {
        session.close();

        return res.status(200).json({
          avatar,
          message: "apiMyAvatarSuccess",
        });
      },
      onError: (error) => {
        session.close();
        console.log(error);
        return res.status(500).json({ message: "apiServerError" });
      },
    });
});

module.exports = router;
