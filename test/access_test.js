const request = require("supertest");
const app = require("./app");
const access = require("../routes/access");
const post = require("../routes/post");
const router = require("express").Router();
const agent = require("superagent");

const testUser1 = agent.agent();

router.use("/", access);
router.use("/post", post);

app.use(router);

describe("POST /register success; register new user", () => {
  it("responds with registration success message, status code 201", (done) => {
    const body = {
      nameFirst: "test1",
      nameLast: "user1",
      login: "testUser1",
      password: "zaq1@WSX",
    };

    request(app)
      .post("/register")
      .send({ ...body })
      .expect(201, {
        message: "apiRegisterSuccess",
      })
      .then(() => done())
      .catch((err) => done(err));
  });
});

describe("POST /register error; register user with same credentials", () => {
  it("responds with registration error message, status code 409", (done) => {
    const body = {
      nameFirst: "test1",
      nameLast: "user1",
      login: "testUser1",
      password: "zaq1@WSX",
    };

    request(app)
      .post("/register")
      .send({ ...body })
      .expect(409, {
        message: "apiRegisterError",
      })
      .then(() => done())
      .catch((err) => done());
  });
});

describe("POST /login success; login to user account", () => {
  it("responds with login success message, status code 201", (done) => {
    const body = {
      login: "testUser1",
      password: "zaq1@WSX",
    };

    request(app)
      .post("/login")
      .send({ ...body })
      .expect(201, {
        message: "apiLoginSuccess",
      })
      .then((res) => {
        console.log(res);
        process.env.TEST_COOKIE = res.headers["set-cookie"][0];
        done();
      })
      .catch((err) => done());
  });
});

describe("POST /login error; try to login to non existing user", () => {
  it("responds with login error message, status code 422", (done) => {
    const body = {
      login: "testUser2",
      password: "zaq1@WSX",
    };

    request(app)
      .post("/login")
      .send({ ...body })
      .expect(403, {
        message: "apiIncorrectCredentialsError",
      })
      .then(() => done())
      .catch((err) => done());
  });
});

describe("POST /post error; add new post", () => {
  it("responds with post created success, status code 201", (done) => {
    const body = {
      content: "hello world",
      tags: ["abc"],
      type: "public",
      pictures: [],
    };

    request(app)
      .post("/post")
      .auth(user.login, user.password)
      .send({ ...body })
      .expect(201, {
        message: "apiLoginSuccess",
      })
      .then(() => done())
      .catch((err) => done(err));
  });
});
