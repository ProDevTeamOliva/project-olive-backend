const router = require("express").Router();
const {
  saveBase64Picture,
  neo4jQueryWrapper,
  validateFields,
} = require("../utils/utils");
const { v4: uuidv4 } = require("uuid");
const { PostError, NotFoundError } = require("../utils/errors");
const { parseIdQuery, parseIdParam } = require("../utils/middlewares");

router.get("/", parseIdQuery, (req, res, next) => {
  const tag = req.query.tag ?? "";
  const { id } = req.query;
  const sessionUserID = req.user._id.toString();

  const whereSetup = [""];
  if (id !== undefined) {
    whereSetup.push("p.id < $id");
  }
  if (tag.length) {
    whereSetup.push("$tag IN p.tags");
  }

  neo4jQueryWrapper(
    `MATCH (p:Post)<-[:POSTED]-(u:User) WHERE (p.type=$typePublic OR (p.type=$typeFriends AND (u.sessionUserID=$sessionUserID OR (u)-[:FRIEND]-(:User{sessionUserID:$sessionUserID})))) ${
      whereSetup.length > 1 ? whereSetup.join(" AND ") : ""
    } OPTIONAL MATCH (p)<-[:LIKED]-(u2:User) RETURN p, u, collect(u2) AS l ORDER BY p.date DESC LIMIT 15`,
    { tag, id, typePublic: "public", typeFriends: "friends", sessionUserID }
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
    "MATCH (pc:PostCounter), (u:User{sessionUserID:$sessionUserID}) CALL apoc.atomic.add(pc,'next',1) YIELD oldValue AS next MERGE (u)-[:POSTED]->(p:Post{id: next, content:$content, tags:$tags, type:$type, date:datetime(), pictures:$pictures}) RETURN p, u",
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
    "MATCH (p:Post) UNWIND p.tags as t WITH t WHERE t STARTS WITH $tagPart RETURN DISTINCT t ORDER BY t LIMIT 15",
    { type: "public", tagPart }
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

router.get("/:id", parseIdParam, (req, res, next) => {
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

router.delete("/:id", parseIdParam, (req, res, next) => {
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

router.get("/:id/comment", parseIdParam, (req, res, next) => {
  const idSource = req.user._id;
  const idTarget = req.params.id;

  neo4jQueryWrapper(
    "MATCH (u:User)-[:COMMENTED]->(c:Comment)-[:UNDER]->(p:Post{id: $idPost}) RETURN u, c, p",
    {
      idPost: idTarget,
    }
  )
    .then(({ records }) => {
      if (!records) {
        throw new PostError("apiCommentsGetError");
      }

      const comments = records.map((record) => {
        const postId = record.get("p").properties.id;
        const user = record.get("u").properties;
        user.sessionUserID = undefined;

        const comment = record.get("c").properties;
        comment.postId = postId;
        comment.user = user;

        return comment;
      });

      res.status(200).json({
        message: "apiCommentsGetSuccess",
        comments,
      });
    })
    .catch((err) => next(err));
});

router.post("/:id/comment", parseIdParam, (req, res, next) => {
  const idSource = req.user._id;
  const idTarget = req.params.id;
  const comment = req.body.comment;

  neo4jQueryWrapper(
    "MATCH (cc:CommentCounter), (u:User{sessionUserID: $sessionUserID}) MATCH (p:Post{id: $idPost}) CALL apoc.atomic.add(cc,'next',1) YIELD oldValue AS next CREATE (u)-[:COMMENTED]->(c:Comment {id: next, date: datetime(), comment: $comment})-[:UNDER]->(p) RETURN u, c, p",
    {
      sessionUserID: idSource.toString(),
      idPost: idTarget,
      comment,
    }
  )
    .then(({ records: [record] }) => {
      if (!record) {
        throw new PostError("apiPostCommentError");
      }

      const comment = record.get("c").properties;
      const user = record.get("u").properties;
      const post = record.get("p").properties;

      res.status(201).json({
        message: "apiPostCommentSuccess",
        comment: {
          comment: comment.comment,
          date: comment.date,
          commentId: comment.id,
          authorLogin: user.login,
          postId: post.id,
        },
      });
    })
    .catch((err) => next(err));
});

router.delete("/comment/:id", parseIdParam, (req, res, next) => {
  const idSource = req.user._id;
  const idComment = req.params.id;

  neo4jQueryWrapper(
    "MATCH (u:User{sessionUserID: $sessionUserID})-[r1:COMMENTED]->(c:Comment {id: $idComment}) DETACH DELETE c RETURN u, c, p",
    {
      sessionUserID: idSource.toString(),
      idComment,
    }
  )
    .then(({ records: [record] }) => {
      if (!record) {
        throw new PostError("apiCommentDeleteError");
      }
      res.status(200).json({
        message: "apiCommentDeleteSuccess",
      });
    })
    .catch((err) => next(err));
});

router.post("/:id/like", parseIdParam, (req, res, next) => {
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
      const post = record.get("p").properties;
      const user = record.get("u").properties;
      res.status(201).json({
        message: "apiPostLikeSuccess",
        id: post.id,
        user,
      });
    })
    .catch((err) => next(err));
});

router.delete("/:id/like", parseIdParam, (req, res, next) => {
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
      const post = record.get("p").properties;
      const user = record.get("u").properties;
      res.status(200).json({
        message: "apiPostUnlikeSuccess",
        id: post.id,
        user,
      });
    })
    .catch((err) => next(err));
});

module.exports = router;
