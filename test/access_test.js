const request = require("supertest");
const app = require("./app");
const access = require("../routes/access");
const post = require("../routes/post");
const router = require("express").Router();
const agent = require("superagent");
const { authenticationCheck, testLogIn } = require("../utils/middlewares");

const user = {
  nameFirst: "test1",
  nameLast: "user1",
  username: "testUser1",
  password: "zaq1@WSX",
};

const body = {
  _id: "62a642ed7823b7d8b00945d9",
  content: "hello world",
  tags: ["abc"],
  type: "public",
  pictures: [],
};
// const testUser1 = agent.agent();

router.use("/", access);
router.use("/post", testLogIn, post);
app.use(router);

let sessionUserID1;

// request(app)
//   .post("/register")
//   .send(user)
//   .then((res) => {
//     sessionUserID1 = res._id;
//   })
//   .catch((err) => console.log(err));

request(app)
  .post("/post")
  .send(body)
  .then((res) => {
    console.log(res.username);
    console.log(res.user);
    console.log("success");
  })
  .catch((err) => {
    console.log(err);
  });

// describe("POST /register success; register new user", () => {
//   it("responds with registration success message, status code 201", (done) => {
//     const body = {
//       nameFirst: "test1",
//       nameLast: "user1",
//       login: "testUser1",
//       password: "zaq1@WSX",
//     };

//     request(app)
//       .post("/register")
//       .send({ ...body })
//       .expect(201, {
//         message: "apiRegisterSuccess",
//       })
//       .then(() => done())
//       .catch((err) => done(err));
//   });
// });

// describe("POST /register error; register user with same credentials", () => {
//   it("responds with registration error message, status code 409", (done) => {
//     const body = {
//       nameFirst: "test1",
//       nameLast: "user1",
//       login: "testUser1",
//       password: "zaq1@WSX",
//     };

//     request(app)
//       .post("/register")
//       .send({ ...body })
//       .expect(409, {
//         message: "apiRegisterError",
//       })
//       .then(() => done())
//       .catch((err) => done());
//   });
// });

// describe("POST /login success; login to user account", () => {
//   it("responds with login success message, status code 201", (done) => {
//     const body = {
//       login: "testUser1",
//       password: "zaq1@WSX",
//     };

//     request(app)
//       .post("/login")
//       .send({ ...body })
//       .expect(201, {
//         message: "apiLoginSuccess",
//       })
//       .then((res) => {
//         console.log(res);
//         process.env.TEST_COOKIE = res.headers["set-cookie"][0];
//         done();
//       })
//       .catch((err) => done());
//   });
// });

// describe("POST /login error; try to login to non existing user", () => {
//   it("responds with login error message, status code 422", (done) => {
//     const body = {
//       login: "testUser2",
//       password: "zaq1@WSX",
//     };

//     request(app)
//       .post("/login")
//       .send({ ...body })
//       .expect(403, {
//         message: "apiIncorrectCredentialsError",
//       })
//       .then(() => done())
//       .catch((err) => done());
//   });
// });

// describe("POST /post error; add new post", () => {
//   it("responds with post created success, status code 201", (done) => {
//     const body = {
//       content: "hello world",
//       tags: ["abc"],
//       type: "public",
//       pictures: [],
//     };

//     request(app)
//       .post("/post")
//       .auth(user.login, user.password)
//       .send({ ...body })
//       .expect(201, {
//         message: "apiLoginSuccess",
//       })
//       .then(() => done())
//       .catch((err) => done(err));
//   });
// });
