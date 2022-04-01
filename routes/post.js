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
  postLikeDelete,
} = require("../cypher/requests");
const { PostError, NotFoundError } = require("../utils/errors");

router.get("/", (req, res, next) => {

  const session = neo4jDriver.session();
  session.run(postGet)
    .then(({records}) => {
      const posts = records.map(record => {

        const post = record.get("p").properties;
        const user = record.get("u").properties;
        user.sessionUserID = undefined;
        post.user = user;

        post.likes = record.get("l").map((l) => {
          const properties = l.properties;
          properties.sessionUserID = undefined;
          return properties;
        });

        return post
      })

      res.status(200).json({
        message: "apiPostsSuccess",
        posts
      });
    })
    .catch(err => next(err))
    .then(() => session.close())
});

router.get("/search/:tag", (req, res, next) => {
  const tag = req.params.tag.toString();

  const session = neo4jDriver.session();
  session
    .run(postSearchGet, {
      tag,
    })
    .then(({records}) => {
      const posts = records.map(record => {

        const post = record.get("p").properties;
        const user = record.get("u").properties;
        user.sessionUserID = undefined;
        post.user = user;

        post.likes = record.get("l").map((l) => {
          const properties = l.properties;
          properties.sessionUserID = undefined;
          return properties;
        });

        return post
      })

      res.status(200).json({
        message: "apiPostsSuccess",
        posts
      });
    })
    .catch(err => next(err))
    .then(() => session.close())
});

router.post("/", (req, res, next) => {
  const sessionUserID = req.user._id.toString();

  const { content, tags, pictures, type } = req.body;

  const picturesParsed = (pictures ?? []).map(
    (element) => `/public/pictures/${uuidv4()}-${element.filename}`
  );

  const session = neo4jDriver.session();
  session
    .run(postPost, {
      content,
      sessionUserID,
      tags,
      type,
      picturesParsed,
    })
    .then(({records: [record]}) => {

      const post = {
        ...record.get("p").properties,
        user: record.get("u").properties,
      };
      post.user.sessionUserID = undefined;

      for (const [index, filePath] of picturesParsed.entries()) {
        saveBase64Picture(filePath, pictures[index].picture);
      }

      res.status(201).json({
        message: "apiPostCreateSuccess",
        post,
      })
    })
    .catch(err => next(err))
    .then(() => session.close())
});

router.get("/:id", (req, res, next) => {
  const id = req.params.id;

  const session = neo4jDriver.session();
  session
    .run(postGetById, {
      id,
    })
    .then(({records:[record]}) => {
      if(!record) {
        throw new NotFoundError("apiPostNotFoundError")
      }
      const post = record.get("p").properties;
      const user = record.get("u").properties;
      user.sessionUserID = undefined;
      post.user = user;

      post.likes = record.get("l").map((l) => {
        const properties = l.properties;
        properties.sessionUserID = undefined;
        return properties;
      });

      res.status(200).json({
        post,
        message: "apiPostFoundSuccess",
      });

    })
    .catch(err => next(err))
    .then(() => session.close())
});

router.delete("/:id", (req, res, next) => {
  const id = req.params.id;

  const session = neo4jDriver.session();
  session
    .run(postDelete, {
      id,
    })
    .then(({records:[record]}) => {
      if(!record) {
        throw new NotFoundError("apiPostNotFoundError")
      }

      res.status(200).json({
        message: "apiPostRemovedSuccess",
      });

    })
    .catch(err => next(err))
    .then(() => session.close())
});

router.post("/:id/like", (req, res, next) => {
  const idSource = req.user._id;
  const idTarget = req.params.id;

  const session = neo4jDriver.session();
  session
    .run(postLikePost, {
      sessionUserID: idSource.toString(),
      id: idTarget,
    })
    .then(({records: [record]}) => {
      if(!record) {
        throw new PostError("apiPostLikeError")
      }
      res.status(201).json({
        message: "apiPostLikeSuccess",
      })
    })
    .catch(err => next(err))
    .then(() => session.close())
});

router.delete("/:id/like", (req, res, next) => {
  const idSource = req.user._id;
  const idTarget = req.params.id;

  const session = neo4jDriver.session();
  session
    .run(postLikeDelete, {
      sessionUserID: idSource.toString(),
      id: idTarget,
    })
    .then(({records: [record]}) => {
      if(!record) {
        throw new PostError("apiPostUnlikeError")
      }
      res.status(200).json({
        message: "apiPostUnlikeSuccess",
      })
    })
    .catch(err => next(err))
    .then(() => session.close())
});

module.exports = router;
