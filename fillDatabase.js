require("./index");

const axios = require("axios").default;
axios.defaults.baseURL = `http://localhost:${process.env.PORT}`;
axios.defaults.withCredentials = true;

const SessionUser = require("./models/SessionUser");
const { neo4jQueryWrapper } = require("./utils/utils");

const users = [
  {
    nameLast: "Kowalski",
    nameFirst: "Adam",
    login: "AKowalski",
    password: "1aX",
    posts: [
      {
        content:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
        tags: ["fame", "clue", "pest"],
        type: "Public",
      },
      {
        content:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
        tags: ["in", "dose", "aid"],
        type: "Public",
      },
    ],
    friends: ["PNowak", "ALewandowska", "JLewandowska"],
    likes: {
      ROstrowski: [0, 1],
    },
  },
  {
    nameLast: "Nowak",
    nameFirst: "Piotr",
    login: "PNowak",
    password: "1aX",
    posts: [
      {
        content:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
        tags: ["meet", "sink", "use"],
        type: "Public",
      },
      {
        content:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
        tags: ["year", "dive", "boat"],
        type: "Public",
      },
    ],
    friends: ["AKowalski", "GNarbut"],
    likes: {
      ALewandowska: [0],
      GNarbut: [1],
    },
  },
  {
    nameLast: "Lewandowska",
    nameFirst: "Anna",
    login: "ALewandowska",
    password: "1aX",
    posts: [
      {
        content:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
        tags: ["boat", "halt", "hook"],
        type: "Public",
      },
      {
        content:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
        tags: ["can", "trip", "hay"],
        type: "Public",
      },
    ],
    friends: ["AKowalski"],
    likes: {
      ALewandowska: [0],
      AKowalski: [1],
    },
  },
  {
    nameLast: "Lewandowska",
    nameFirst: "Julia",
    login: "JLewandowska",
    password: "1aX",
    posts: [
      {
        content:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
        tags: ["trip", "pony", "rear"],
        type: "Public",
      },
      {
        content:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
        tags: ["cat", "gift", "rib"],
        type: "Public",
      },
    ],
    friends: [],
    likes: {},
  },
  {
    nameLast: "Ostrowski",
    nameFirst: "Robert",
    login: "ROstrowski",
    password: "1aX",
    posts: [
      {
        content:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
        tags: ["lost", "hook", "file"],
        type: "Public",
      },
      {
        content:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
        tags: ["coat", "pull", "pay"],
        type: "Public",
      },
    ],
    friends: [],
    likes: {},
  },
  {
    nameLast: "Narbut",
    nameFirst: "Gracjan",
    login: "GNarbut",
    password: "1aX",
    posts: [
      {
        content:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
        tags: ["fish", "plan", "gas"],
        type: "Public",
      },
      {
        content:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
        tags: ["lend", "tool", "soar"],
        type: "Public",
      },
    ],
    friends: ["PNowak", "OKowalczyk"],
    likes: {},
  },
  {
    nameLast: "Kowalczyk",
    nameFirst: "Ola",
    login: "OKowalczyk",
    password: "1aX",
    posts: [
      {
        content:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
        tags: ["man", "duke", "wake"],
        type: "Public",
      },
      {
        content:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
        tags: ["lamp", "ball", "ask"],
        type: "Public",
      },
    ],
    friends: [],
    likes: {},
  },
];

const fillDatabase = async () => {
  await SessionUser.db.collection("sessions").deleteMany();
  console.log("Cleared sessions from MongoDB");
  await SessionUser.deleteMany();
  console.log("Cleared SessionUsers from MongoDB");
  await neo4jQueryWrapper("MATCH (n) DETACH DELETE n");
  console.log("Cleared Neo4J");

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const responseRegister = await axios.post("/register", user);
    console.log(responseRegister.data);

    const responseLogin = await axios.post("/login", user);
    const config = { headers: { Cookie: responseLogin.headers["set-cookie"] } };
    console.log(responseLogin.data);

    const responseMe = await axios.get("/me", config);
    user.id = responseMe.data.user.id;
    console.log(responseMe.data);

    for (let j = 0; j < user.posts.length; j++) {
      const post = user.posts[j];
      const responsePost = await axios.post("/post", post, config);
      post.id = responsePost.data.post.id;
      console.log(responsePost.data);
    }

    const responseLogout = await axios.post("/logout", {}, config);
    console.log(responseLogout.data);
  }

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const responseLogin = await axios.post("/login", user);
    const config = { headers: { Cookie: responseLogin.headers["set-cookie"] } };
    console.log(responseLogin.data);

    for (let j = 0; j < user.friends.length; j++) {
      const friendLogin = user.friends[j];
      const friend = users.find((user) => user.login === friendLogin);
      try {
        const responseFriend = await axios.post(
          `/user/${friend.id}/friend`,
          {},
          config
        );
        console.log(responseFriend.data);
      } catch {
        const responseAccept = await axios.post(
          `/user/${friend.id}/accept`,
          {},
          config
        );
        console.log(responseAccept.data);
      }
    }

    const likes = Object.entries(user.likes);
    for (let j = 0; j < likes.length; j++) {
      const [userLogin, posts] = likes[j];
      const user = users.find((user) => user.login === userLogin);
      for (let k = 0; k < posts.length; k++) {
        const post = user.posts[k];
        const responseLike = await axios.post(
          `/post/${post.id}/like`,
          {},
          config
        );
        console.log(responseLike.data);
      }
    }

    const responseLogout = await axios.post("/logout", {}, config);
    console.log(responseLogout.data);
  }

  process.exit();
};

setTimeout(fillDatabase, 1000);
