const router = require("express").Router();
const neo4jDriver = require("../config/neo4jDriver");
const { saveBase64Picture } = require("../utils/utils");
const { v4: uuidv4 } = require("uuid");
const {
  postGet,
  postSearchGet,
  postPost,
  postGetById,
  postDelete,
  postLikePost,
  postLikeDelete
} = require("../cypher/requests");

router.get("/", async (req, res) => {
  const posts = [];

  const session = neo4jDriver.session();
  session
    .run(
      postGet
    )
    .subscribe({
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
          message: "apiPostsSuccess",
        });
      },
      onError: (error) => {
        session.close();
        return res.status(500).json({ message: "apiServerError" });
      },
    });
});

router.get("/search/:tag", async (req, res) => {
  const posts = [];
  const tag = req.params.tag.toString();

  const session = neo4jDriver.session();
  session
    .run(
      postSearchGet,
      {
        tag,
      }
    )
    .subscribe({
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
          message: "apiPostsSuccess",
        });
      },
      onError: (error) => {
        session.close();
        return res.status(500).json({ message: "apiServerError" });
      },
    });
});

router.post("/", async (req, res) => {
  const sessionUserID = req.user._id.toString();

  const { content, tags, pictures, type } = req.body;

  const picturesParsed = pictures.map(
    (element) => `/public/pictures/${uuidv4()}-${element.filename}`
  );

  let post = undefined;

  const session = neo4jDriver.session();
  session
    .run(
      postPost,
      {
        content,
        sessionUserID,
        tags,
        type,
        picturesParsed,
      }
    )
    .subscribe({
      onNext: (record) => {
        post = { ...record.get("p").properties, user: record.get("u").properties };
        post.user.sessionUserID = undefined;

        for (const [index, filePath] of picturesParsed.entries()) {
          saveBase64Picture(filePath, pictures[index].picture);
        }
      },
      onCompleted: () => {
        session.close();

        return res.status(201).json({
          message: "apiPostCreateSuccess",
          post,
        });
      },
      onError: (error) => {
        session.close();
        return res.status(400).json({ message: "apiPostCreateError" });
      },
    });
});

router.get("/:id", async (req, res) => {
  const id = req.params.id;
  let post = undefined;

  const session = neo4jDriver.session();
  session
    .run(
      postGetById,
      {
        id,
      }
    )
    .subscribe({
      onNext: (record) => {
        const postFound = record.get("p").properties;
        const user = record.get("u").properties;
        user.sessionUserID = undefined;
        postFound.user = user;

        postFound.likes = record.get("l").map((l) => {
          const properties = l.properties;
          properties.sessionUserID = undefined;
          return properties;
        });

        post = postFound;
      },
      onCompleted: () => {
        session.close();
        if (post) {
          return res.status(200).json({
            post,
            message: "apiPostFoundSuccess",
          });
        } else {
          return res.status(404).json({ message: "apiPostNotFoundError" });
        }
      },
      onError: (error) => {
        session.close();
        return res.status(500).json({ message: "apiServerError" });
      },
    });
});

router.delete("/:id", async (req, res) => {
  const id = req.params.id;
  let result = false;

  const session = neo4jDriver.session();
  session
    .run(
      postDelete,
      {
        id,
      })
    .subscribe({
      onNext: (record) => {
        result = true;
      },
      onCompleted: () => {
        session.close();

        if (result) {
          return res.status(200).json({
            message: "apiPostRemovedSuccess",
          });
        } else {
          return res.status(404).json({ message: "apiPostRemovedError" });
        }
      },
      onError: (error) => {
        session.close();
        return res.status(500).json({ message: "apiServerError" });
      },
    });
});

router.post("/:id/like", async (req, res) => {
  const idSource = req.user._id;
  const idTarget = req.params.id;
  let result = false;

  const session = neo4jDriver.session();
  session
    .run(
      postLikePost,
      {
        sessionUserID: idSource.toString(),
        id: idTarget,
      }
    )
    .subscribe({
      onNext: (record) => {
        result = true;
      },
      onCompleted: () => {
        session.close();

        if (result) {
          return res.status(201).json({
            message: "apiPostLikeSuccess",
          });
        } else {
          return res.status(400).json({ message: "apiPostLikeError" });
        }
      },
      onError: (error) => {
        session.close();
        return res.status(500).json({ message: "apiServerError" });
      },
    });
});

router.delete("/:id/like", async (req, res) => {
  const idSource = req.user._id;
  const idTarget = req.params.id;
  let result = false;

  const session = neo4jDriver.session();
  session
    .run(
      postLikeDelete,
      {
        sessionUserID: idSource.toString(),
        id: idTarget,
      }
    )
    .subscribe({
      onNext: (record) => {
        result = true;
      },
      onCompleted: () => {
        session.close();

        if (result) {
          return res.status(200).json({
            message: "apiPostUnlikeSuccess",
          });
        } else {
          return res.status(400).json({ message: "apiPostUnlikeError" });
        }
      },
      onError: (error) => {
        session.close();
        return res.status(500).json({ message: "apiServerError" });
      },
    });
});

module.exports = router;
