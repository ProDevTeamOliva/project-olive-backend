const request = require("supertest");
const assert = require("assert");
const app = require("./app");

const access = require("../routes/access");
const post = require("../routes/post");
const me = require("../routes/me");
const user = require("../routes/user");

const router = require("express").Router();
const { testLogIn } = require("../utils/middlewares");
const { neo4jQueryWrapper } = require("../utils/utils");

const {
  testUser1,
  testUser2,
  testPostPublicNoImages,
  testComment,
  testPicture,
} = require("./constants");

router.use("/", testLogIn, access);
router.use("/post", testLogIn, post);
router.use("/me", testLogIn, me);
router.use("/user", testLogIn, user);

app.use(router);

describe("access tests", async () => {
  describe("POST /register", () => {
    it("responds with registration success message, status code 201", (done) => {
      request(app)
        .post("/register")
        .send(testUser1)
        .expect(201)
        .then((res) => {
          assert(res._body.message, "apiRegisterSuccess");

          neo4jQueryWrapper("MATCH (u:User {login: $login}) RETURN u", {
            login: testUser1.login,
          })
            .then(({ records: [record] }) => {
              const user = record.get(record.keys[0]).properties;
              testUser1.sessionUserID = user.sessionUserID;
              done();
            })
            .catch((err) => next(err));
        })
        .catch((err) => done(err));
    });
  });

  describe("POST /login", () => {
    it("responds with login success message, status code 201", (done) => {
      request(app)
        .post("/login")
        .send({
          login: testUser1.login,
          password: testUser1.password,
        })
        .expect(201, {
          message: "apiLoginSuccess",
        })
        .then(() => done())
        .catch((err) => done(err));
    });
  });

  describe("POST /logout", () => {
    it("responds with logout success message, status code 201", (done) => {
      request(app)
        .post("/logout")
        .send({
          _id: testUser1.sessionUserID,
        })
        .expect(200, {
          message: "apiLogoutSuccess",
        })
        .then(() => done())
        .catch((err) => done(err));
    });
  });

  try {
    await request(app).post("/register").send(testUser2);

    const neo4jResponse = await neo4jQueryWrapper(
      "MATCH (u:User {login: $login}) RETURN u",
      {
        login: testUser2.login,
      }
    );

    const user2 = neo4jResponse.get(record.keys[0]).properties;
    testUser2.sessionUserID = user2.sessionUserID;
  } catch (err) {
    console.log(err);
  }
});

describe("post tests", () => {
  describe("POST /post", () => {
    it("responds with post creation success message, status code 201", (done) => {
      request(app)
        .post("/post")
        .send({
          _id: testUser1.sessionUserID,
          ...testPostPublicNoImages,
        })
        .end((err, res) => {
          if (err) {
            done(err);
          }

          assert(res.status, 201);
          assert(res._body.message, "apiPostCreateSuccess");
          done();
        });
    });
  });

  describe("POST /post/0/like", () => {
    it("responds with like success message, status code 201", (done) => {
      request(app)
        .post("/post/0/like")
        .send({
          _id: testUser1.sessionUserID,
        })
        .end((err, res) => {
          if (err) {
            done(err);
          }

          assert(res.status, 201);
          assert(res._body.message, "apiPostLikeSuccess");
          done();
        });
    });
  });

  describe("DELETE /post/0/like", () => {
    it("responds with like deletion success message, status code 200", (done) => {
      request(app)
        .delete("/post/0/like")
        .send({
          _id: testUser1.sessionUserID,
          ...testPostPublicNoImages,
        })
        .end((err, res) => {
          if (err) {
            done(err);
          }

          assert(res.status, 200);
          assert(res._body.message, "apiPostUnlikeSuccess");
          done();
        });
    });
  });

  describe("POST /post/0/comment", () => {
    it("responds with comment creation success message, status code 201", (done) => {
      request(app)
        .post("/post/0/comment")
        .send({
          _id: testUser1.sessionUserID,
          ...testComment,
        })
        .end((err, res) => {
          if (err) {
            done(err);
          }

          assert(res.status, 201);
          assert(res._body.message, "apiPostCommentSuccess");
          done();
        });
    });
  });

  describe("POST /post/comment/0", () => {
    it("responds with comment deletion success message, status code 200", (done) => {
      request(app)
        .delete("/post/comment/0")
        .send({
          _id: testUser1.sessionUserID,
        })
        .end((err, res) => {
          if (err) {
            done(err);
          }

          assert(res.status, 200);
          assert(res._body.message, "apiCommentDeleteSuccess");
          done();
        });
    });
  });

  describe("DELETE /post/0", () => {
    it("responds with post deletion success message, status code 200", (done) => {
      request(app)
        .delete("/post/0")
        .send({
          _id: testUser1.sessionUserID,
        })
        .end((err, res) => {
          if (err) {
            done(err);
          }

          assert(res.status, 200);
          assert(res._body.message, "apiPostRemovedSuccess");
          done();
        });
    });
  });
});

describe("me tests", () => {
  describe("GET /me", () => {
    it("responds with my data fetch success message, status code 200", (done) => {
      request(app)
        .get("/me")
        .send({
          _id: testUser1.sessionUserID,
        })
        .end((err, res) => {
          if (err) {
            done(err);
          }

          assert(res.status, 200);
          assert(res._body.message, "apiMyDataSuccess");
          done();
        });
    });
  });

  describe("POST /me/picture", () => {
    it("responds with picture creation success message, status code 200", (done) => {
      request(app)
        .post("/me/picture")
        .send({
          _id: testUser1.sessionUserID,
          pictures: [testPicture],
        })
        .end((err, res) => {
          if (err) {
            done(err);
          }

          assert(res.status, 200);
          assert(res._body.message, "apiMyPicturesSuccess");
          done();
        });
    });
  });

  describe("DELETE /me/picture/0", () => {
    it("responds with picture creation success message, status code 200", (done) => {
      request(app)
        .delete("/me/picture/0")
        .send({
          _id: testUser1.sessionUserID,
        })
        .end((err, res) => {
          if (err) {
            done(err);
          }

          assert(res.status, 200);
          assert(res._body.message, "apiMyPictureDeleteSuccess");
          done();
        });
    });
  });
});

describe("user tests", () => {
  describe("POST /user/1/friend", () => {
    it("responds with friend pending success message, status code 200", (done) => {
      request(app)
        .post("/user/1/friend")
        .send({
          _id: testUser1.sessionUserID,
        })
        .end((err, res) => {
          if (err) {
            done(err);
          }

          assert(res.status, 201);
          assert(res._body.message, "apiFriendPendingSuccess");
          done();
        });
    });
  });

  describe("GET /user", () => {
    it("responds with user data fetch success message, status code 200", (done) => {
      request(app)
        .get("/user")
        .send({
          _id: testUser1.sessionUserID,
        })
        .end((err, res) => {
          if (err) {
            done(err);
          }

          assert(res.status, 200);
          assert(res._body.message, "apiUserFoundSuccess");
          done();
        });
    });
  });

  describe("GET /user/0/post", () => {
    it("responds with user posts fetch success message, status code 200", (done) => {
      request(app)
        .get("/user/0/post")
        .send({
          _id: testUser1.sessionUserID,
        })
        .end((err, res) => {
          if (err) {
            done(err);
          }

          assert(res.status, 200);
          assert(res._body.message, "apiUserPostsSuccess");
          assert(res._body.posts.length === 0, true);
          done();
        });
    });
  });

  describe("POST /user/1/friend", () => {
    it("responds with friend delete success message, status code 200", (done) => {
      request(app)
        .delete("/user/1/friend")
        .send({
          _id: testUser1.sessionUserID,
        })
        .end((err, res) => {
          if (err) {
            done(err);
          }

          assert(res.status, 201);
          assert(res._body.message, "apiFriendRemoveSuccess");
          done();
        });
    });
  });
});
