require("dotenv").config();
const mongoose = require("./config/mongo")
const neo4jDriver = require("./config/neo4jDriver");
const SessionUser = require("./models/SessionUser");

const users = [
    {
       "nameLast":"Kowalski",
       "nameFirst":"Adam",
       "login":"AKowalski",
       "password":"123"
    },
    {
       "nameLast":"Nowak",
       "nameFirst":"Piotr",
       "login":"PNowak",
       "password":"123"
    },
    {
       "nameLast":"Lewandowska",
       "nameFirst":"Anna",
       "login":"ALewandowska",
       "password":"123"
    },
    {
       "nameLast":"Lewandowska",
       "nameFirst":"Julia",
       "login":"JLewandowska",
       "password":"123"
    },
    {
       "nameLast":"Ostrowski",
       "nameFirst":"Robert",
       "login":"ROstrowski",
       "password":"123"
    },
    {
       "nameLast":"Narbut",
       "nameFirst":"Gracjan",
       "login":"GNarbut",
       "password":"123"
    },
    {
       "nameLast":"Kowalczyk",
       "nameFirst":"Ola",
       "login":"OKowalczyk",
       "password":"123"
    }
 ]

const main = async () => {
    await SessionUser.deleteMany()
    const session = neo4jDriver.session();
    await session.run("match (n) detach delete n")
    await session.close();

    const usersSaved = []

    for(let i=0; i<users.length; i++) {
        const {login, password, nameFirst, nameLast} = users[i]
        const userSaved = await SessionUser.register({ login }, password)

        const session = neo4jDriver.session();

        const result = await session.run(
            "CREATE (u:User:ID {id: randomUUID(), nameFirst: $nameFirst, nameLast: $nameLast, login: $login, sessionUserID: $sessionUserID, avatar: $avatar, registrationDate:datetime()}) RETURN u",
            {
              nameFirst,
              nameLast,
              login: userSaved.login,
              sessionUserID: userSaved._id.toString(),
              avatar: "/api/file/avatar_default.jpg",
            }
          )
        usersSaved.push(result.records[0].get(0).properties)

        await session.close();
    }

    await mongoose.connection.close()
    process.exit()
}

main()