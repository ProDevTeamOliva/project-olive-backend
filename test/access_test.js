const request = require("supertest");
const assert = require("assert");
const app = require("./app");
const access = require("../routes/access");
const post = require("../routes/post");
const router = require("express").Router();
const { testLogIn } = require("../utils/middlewares");

const { testUser1, testUser2 } = require("./constants");

router.use("/", access);
// router.use("/post", testLogIn, post);
app.use(router);

describe("access tests", () => {
  describe("POST /register", () => {
    it("responds with registration success message, status code 201", (done) => {
      request(app)
        .post("/register")
        .send(testUser1)
        .expect(201)
        .then((res) => {
          assert(res._body.message, "apiRegisterSuccess");
          testUser1.sessionUserID = res._body._id;
          done();
        })
        .catch((err) => done(err));
    });

    // it("responds with registration error message, status code 409", (done) => {
    //   request(app)
    //     .post("/register")
    //     .send(testUser1)
    //     .expect(409, {
    //       message: "apiRegisterError",
    //     })
    //     .end((err, res) => {
    //       if(!err){
    //         done("Error!");
    //       }

    //       done();
    //     });
    // });
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

    // it("responds with login error message, status code 422", (done) => {
    //   request(app)
    //     .post("/login")
    //     .send({
    //       login: testUser2.login,
    //       password: testUser2.password,
    //     })
    //     .expect(403, {
    //       message: "apiIncorrectCredentialsError",
    //     })
    //     .end((err, res) => {
    //       if(!err){
    //         done("Error!");
    //       }

    //       done();
    //     });
    // });
  });
});
