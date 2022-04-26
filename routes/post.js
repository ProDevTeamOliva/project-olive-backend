const router = require("express").Router();
const {
  saveBase64Picture,
  neo4jQueryWrapper,
  validateFields,
} = require("../utils/utils");
const { v4: uuidv4 } = require("uuid");
const { PostError, NotFoundError } = require("../utils/errors");

router.get("/", (req, res, next) => {
  const tag = req.query.tag ?? "";

  neo4jQueryWrapper(
    `MATCH (p:Post)<-[:POSTED]-(u:User) ${
      tag.length ? "WHERE $tag IN p.tags" : ""
    } optional match (p)<-[:LIKED]-(u2:User) RETURN p, u, collect(u2) as l order by p.date desc`,
    { tag }
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
    .catch((err) => next(err));
});

router.post("/", (req, res, next) => {
  const sessionUserID = req.user._id.toString();
  const { content, tags, pictures, type } = req.body;

  if (!validateFields(next, { content, tags, type, pictures })) {
    return;
  }

  const picturesParsed = (pictures ?? []).map(
    (element) => `/public/pictures/${uuidv4()}-${element.filename}`
  );

  neo4jQueryWrapper(
    "MATCH (u:User{sessionUserID:$sessionUserID}) merge (u)-[:POSTED]->(p:Post:ID{id:randomUUID(), content:$content, tags:$tags, type:$type, date:datetime(), pictures:$pictures}) return p, u",
    {
      content,
      sessionUserID,
      tags,
      type,
      pictures: picturesParsed,
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
    .catch((err) => next(err));
});

router.get("/tag", (req, res, next) => {
  const tagPart = req.query.tagPart ?? "";

  neo4jQueryWrapper(
    "MATCH (p:Post{type:$type}) UNWIND p.tags as t WITH t WHERE t STARTS WITH $tagPart RETURN DISTINCT t ORDER BY t LIMIT 15",
    { type: "Public", tagPart }
  )
    .then(({ records }) => {
      const tags = records.map((record) => record.get("t"));
      res.status(200).json({
        message: "apiTagsSearchSuccess",
        payload: tags,
      });
    })
    .catch((err) => next(err));
});

router.get("/:id", (req, res, next) => {
  const id = req.params.id;

  neo4jQueryWrapper(
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
    .catch((err) => next(err));
});

router.delete("/:id", (req, res, next) => {
  const id = req.params.id;
  const sessionUserID = req.user._id.toString();

  neo4jQueryWrapper(
    "MATCH (p:Post {id: $id})<-[:POSTED]-(u:User{sessionUserID:$sessionUserID}) detach delete p RETURN p",
    {
      id,
      sessionUserID,
    }
  )
    .then(({ records: [record] }) => {
      if (!record) {
        throw new NotFoundError("apiPostNotFoundError");
      }

      res.status(200).json({
        message: "apiPostRemovedSuccess",
      });
    })
    .catch((err) => next(err));
});

router.post("/:id/like", (req, res, next) => {
  const idSource = req.user._id;
  const idTarget = req.params.id;

  neo4jQueryWrapper(
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
    .catch((err) => next(err));
});

router.delete("/:id/like", (req, res, next) => {
  const idSource = req.user._id;
  const idTarget = req.params.id;

  neo4jQueryWrapper(
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
    .catch((err) => next(err));
});

module.exports = router;
