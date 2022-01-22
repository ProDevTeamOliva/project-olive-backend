const router = require("express").Router();
const neo4jDriver = require("../config/neo4jDriver");

router.get("/", async (req, res) => {
    const posts = [];
  
    const session = neo4jDriver.session();
    session.run("MATCH (p:Post)<-[:POSTED]-(u:User) RETURN p, u").subscribe({
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

    const {
        content,
        tags
    } = req.body
  
    const session = neo4jDriver.session();
    session
      .run(
        "match (u:User{sessionUserID:$sessionUserID}) merge (u)-[:POSTED]->(p:Post:ID{id:randomUUID(), content:$content, tags:$tags, date:datetime()}) return p, u",
        {
            content,
            sessionUserID,
            tags
        }
      )
      .subscribe({
        onNext: (record) => {
            const post = record.get("p").properties
            const user = record.get("u").properties
            user.sessionUserID=undefined
            post.user= user
            return res.status(201).json({
                message: "apiPostCreateSuccess",
                post
            });
        },
        onCompleted: () => {
          session.close();
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
      .run("MATCH (p:Post {id: $id})<-[:POSTED]-(u:User) RETURN p, u", {
        id,
      })
      .subscribe({
        onNext: (record) => {
            const postFound = record.get("p").properties
            const user = record.get("u").properties
            user.sessionUserID=undefined
            postFound.user=user
            post=postFound
            
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
      .run("MATCH (p:Post {id: $id}) detach delete p RETURN p", {
        id,
      })
      .subscribe({
        onNext: (record) => {
            result=true
            
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

module.exports = router;