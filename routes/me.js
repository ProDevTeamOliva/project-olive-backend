const router = require("express").Router();
const neo4jDriver = require("../config/neo4jDriver");
const { saveBase64Picture } = require("../utils/utils.js");
const { v4: uuidv4 } = require("uuid");

router.get("/", async (req, res) => {
  const id = req.user._id;

  const session = neo4jDriver.session();
  session
    .run("MATCH (u:User {sessionUserID: $sessionUserID}) RETURN u", {
      sessionUserID: id.toString(),
    })
    .subscribe({
      onNext: (record) => {
        const recordFull = record.get("u");

        const user = recordFull.properties;
        user.sessionUserID = undefined;

        return res.status(200).json({
          user,
          message: "apiMyDataSuccess",
        });
      },
      onCompleted: () => {
        session.close();
      },
      onError: (error) => {
        session.close();
        return res.status(500).json({ message: "apiServerError" });
      },
    });
});

router.get("/friend", async (req, res) => {
  const id = req.user._id;

  const result = {
    friends: [],
    pendingSent: [],
    pendingReceived: [],
  };

  const session = neo4jDriver.session();
  session
    .run(
      "MATCH (u1:User {sessionUserID: $sessionUserID})-[r:PENDING|FRIEND]-(u2:User) RETURN u2,r",
      {
        sessionUserID: id.toString(),
      }
    )
    .subscribe({
      onNext: (record) => {
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
      },
      onCompleted: () => {
        session.close();
        return res.status(200).json({
          ...result,
          message: "apiMyFriendsSuccess",
        });
      },
      onError: (error) => {
        session.close();
        return res.status(500).json({ message: "apiServerError" });
      },
    });
});

router.get("/post", async (req, res) => {
  const sessionUserID = req.user._id.toString();

  const posts = []

  const session = neo4jDriver.session();
    session.run("MATCH (p:Post)<-[:POSTED]-(u:User{sessionUserID:$sessionUserID}) RETURN p, u", {sessionUserID}).subscribe({
      onNext: (record) => {
        const post = record.get("p").properties;
        const user = record.get("u").properties
        user.sessionUserID=undefined

        post.user = user
  
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
    .run(
      "MATCH (u: User {sessionUserID: $sessionUserID})-[r:UPLOADED]->(p:Picture) RETURN p",
      {
        sessionUserID: id.toString(),
      }
    )
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

router.post("/pictures", async (req, res) => {
  const id = req.user._id;

  const pictures = req.body.pictures.map((element) => {
    const id = uuidv4();

    return {
      id,
      picture: `public/pictures/${id}-${element.filename}`,
      private: element.private,
      base64: element.picture,
    };
  });

  const session = neo4jDriver.session();

  session
    .run(
      "UNWIND $pictures as picture MATCH (u:User {sessionUserID: $sessionUserID}) MERGE (u)-[r:UPLOADED]->(p:Picture {id: picture.id, picture: picture.picture}) RETURN p",
      {
        sessionUserID: id.toString(),
        pictures: pictures,
      }
    )
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

module.exports = router;
