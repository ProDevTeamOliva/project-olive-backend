require("dotenv").config();
const mongoose = require("./config/mongo");
const neo4jDriver = require("./config/neo4jDriver");
const SessionUser = require("./models/SessionUser");

const users = [
  {
    nameLast: "Kowalski",
    nameFirst: "Adam",
    login: "AKowalski",
    password: "123",
    posts: [
      {
        content:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
        tags: ["fame", "clue", "pest"],
      },
      {
        content:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
        tags: ["in", "dose", "aid"],
      },
    ],
  },
  {
    nameLast: "Nowak",
    nameFirst: "Piotr",
    login: "PNowak",
    password: "123",
    posts: [
      {
        content:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
        tags: ["meet", "sink", "use"],
      },
      {
        content:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
        tags: ["year", "dive", "boat"],
      },
    ],
  },
  {
    nameLast: "Lewandowska",
    nameFirst: "Anna",
    login: "ALewandowska",
    password: "123",
    posts: [
      {
        content:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
        tags: ["boat", "halt", "hook"],
      },
      {
        content:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
        tags: ["can", "trip", "hay"],
      },
    ],
  },
  {
    nameLast: "Lewandowska",
    nameFirst: "Julia",
    login: "JLewandowska",
    password: "123",
    posts: [
      {
        content:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
        tags: ["trip", "pony", "rear"],
      },
      {
        content:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
        tags: ["cat", "gift", "rib"],
      },
    ],
  },
  {
    nameLast: "Ostrowski",
    nameFirst: "Robert",
    login: "ROstrowski",
    password: "123",
    posts: [
      {
        content:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
        tags: ["lost", "hook", "file"],
      },
      {
        content:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
        tags: ["coat", "pull", "pay"],
      },
    ],
  },
  {
    nameLast: "Narbut",
    nameFirst: "Gracjan",
    login: "GNarbut",
    password: "123",
    posts: [
      {
        content:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
        tags: ["fish", "plan", "gas"],
      },
      {
        content:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
        tags: ["lend", "tool", "soar"],
      },
    ],
  },
  {
    nameLast: "Kowalczyk",
    nameFirst: "Ola",
    login: "OKowalczyk",
    password: "123",
    posts: [
      {
        content:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
        tags: ["man", "duke", "wake"],
      },
      {
        content:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
        tags: ["lamp", "ball", "ask"],
      },
    ],
  },
];
const friends = [
  ["AKowalski", "OKowalczyk"],
  ["AKowalski", "ALewandowska"],
  ["AKowalski", "PNowak"],
  ["AKowalski", "GNarbut"],
  ["ROstrowski", "GNarbut"],
  ["JLewandowska", "OKowalczyk"],
];

const main = async () => {
  await SessionUser.deleteMany();
  mongoose.connection.collection("sessions").deleteMany();
  const session = neo4jDriver.session();
  await session.run("match (n) detach delete n");
  await session.close();

  const usersSaved = [];
  const postsSaved = [];

  for (let i = 0; i < users.length; i++) {
    const { login, password, nameFirst, nameLast } = users[i];
    const userSaved = await SessionUser.register({ login }, password);

    const session = neo4jDriver.session();
    const result = await session.run(
      "CREATE (u:User:ID {id: randomUUID(), nameFirst: $nameFirst, nameLast: $nameLast, login: $login, sessionUserID: $sessionUserID, avatar: $avatar, registrationDate:datetime()}) RETURN u",
      {
        nameFirst,
        nameLast,
        login: userSaved.login,
        sessionUserID: userSaved._id.toString(),
        avatar: "/public/pictures/avatar_default.png",
      }
    );
    await session.close();

    usersSaved.push(result.records[0].get(0).properties);
  }

  await mongoose.connection.close();

  for (let i = 0; i < users.length; i++) {
    const { posts } = users[i];
    const { id } = usersSaved[i];
    const postsSavedPart = [];

    for (let j = 0; j < posts.length; j++) {
      const { content, tags } = posts[j];

      const session = neo4jDriver.session();
      const result = await session.run(
        "match (u:User{id:$id}) merge (u)-[:POSTED]->(p:Post:ID{id:randomUUID(), content:$content, tags:$tags, date:datetime()}) return p",
        {
          id,
          content,
          tags,
        }
      );
      await session.close();

      postsSavedPart.push(result.records[0].get(0).properties);
    }
    postsSaved.push(postsSavedPart);
  }

  for (let i = 0; i < friends.length; i++) {
    const [login1, login2] = friends[i];

    const session = neo4jDriver.session();
    await session.run(
      "MATCH (u1:User{login: $login1}) MATCH (u2:User{login: $login2}) MERGE (u1)-[f:FRIEND]-(u2) RETURN u1,f,u2",
      {
        login1,
        login2,
      }
    );
    await session.close();
  }

  process.exit();
};

main();
