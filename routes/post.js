const router = require("express").Router();
const neo4jDriver = require("../config/neo4jDriver");
const { saveBase64Picture } = require("../utils/utils");
const { v4: uuidv4 } = require("uuid");
const { PostError, NotFoundError } = require("../utils/errors");

router.get("/", (req, res, next) => {
  const session = neo4jDriver.session();
  session
    .run(
      "MATCH (p:Post)<-[:POSTED]-(u:User) optional match (p)<-[:LIKED]-(u2:User) RETURN p, u, collect(u2) as l order by p.date desc"
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
        message: "apiPostsSuccess",
        posts,
      });
    })
    .catch((err) => next(err))
    .then(() => session.close());
});

router.get("/search/:tag", (req, res, next) => {
  const tag = req.params.tag.toString();

  const session = neo4jDriver.session();
  session
    .run(
      "MATCH (p:Post)<-[:POSTED]-(u:User) WHERE $tag IN p.tags optional match (p)<-[:LIKED]-(u2:User) RETURN p, u, collect(u2) as l order by p.date desc",
      {
        tag,
      }
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
        message: "apiPostsSuccess",
        posts,
      });
    })
    .catch((err) => next(err))
    .then(() => session.close());
});

router.post("/", (req, res, next) => {
  const sessionUserID = req.user._id.toString();

  const { content, tags, pictures, type } = req.body;

  const picturesParsed = (pictures ?? []).map(
    (element) => `/public/pictures/${uuidv4()}-${element.filename}`
  );

  const session = neo4jDriver.session();
  session
    .run(
      "MATCH (u:User{sessionUserID:$sessionUserID}) merge (u)-[:POSTED]->(p:Post:ID{id:randomUUID(), content:$content, tags:$tags, type:$type, date:datetime(), pictures:$picturesParsed}) return p, u",
      {
        content,
        sessionUserID,
        tags,
        type,
        picturesParsed,
      }
    )
    .then(({ records: [record] }) => {
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
      });
    })
    .catch((err) => next(err))
    .then(() => session.close());
});

router.get("/:id", (req, res, next) => {
  const id = req.params.id;

  const session = neo4jDriver.session();
  session
    .run(
      "MATCH (p:Post {id: $id})<-[:POSTED]-(u:User) optional match (p)<-[:LIKED]-(u2:User) RETURN p, u, collect(u2) as l",
      {
        id,
      }
    )
    .then(({ records: [record] }) => {
      if (!record) {
        throw new NotFoundError("apiPostNotFoundError");
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
    .catch((err) => next(err))
    .then(() => session.close());
});

router.delete("/:id", (req, res, next) => {
  const id = req.params.id;

  const session = neo4jDriver.session();
  session
    .run("MATCH (p:Post {id: $id}) detach delete p RETURN p", {
      id,
    })
    .then(({ records: [record] }) => {
      if (!record) {
        throw new NotFoundError("apiPostNotFoundError");
      }

      res.status(200).json({
        message: "apiPostRemovedSuccess",
      });
    })
    .catch((err) => next(err))
    .then(() => session.close());
});

router.post("/:id/like", (req, res, next) => {
  const idSource = req.user._id;
  const idTarget = req.params.id;

  const session = neo4jDriver.session();
  session
    .run(
      "MATCH (u:User{sessionUserID: $sessionUserID}) MATCH (p:Post{id: $id}) WHERE NOT exists((u)-[:LIKED]-(p)) MERGE (u)-[l:LIKED]->(p) RETURN u,l,p",
      {
        sessionUserID: idSource.toString(),
        id: idTarget,
      }
    )
    .then(({ records: [record] }) => {
      if (!record) {
        throw new PostError("apiPostLikeError");
      }
      res.status(201).json({
        message: "apiPostLikeSuccess",
      });
    })
    .catch((err) => next(err))
    .then(() => session.close());
});

router.delete("/:id/like", (req, res, next) => {
  const idSource = req.user._id;
  const idTarget = req.params.id;

  const session = neo4jDriver.session();
  session
    .run(
      "MATCH (u:User{sessionUserID: $sessionUserID})-[r:LIKED]->(p:Post{id: $id}) DELETE r RETURN u,p",
      {
        sessionUserID: idSource.toString(),
        id: idTarget,
      }
    )
    .then(({ records: [record] }) => {
      if (!record) {
        throw new PostError("apiPostUnlikeError");
      }
      res.status(200).json({
        message: "apiPostUnlikeSuccess",
      });
    })
    .catch((err) => next(err))
    .then(() => session.close());
});

module.exports = router;
