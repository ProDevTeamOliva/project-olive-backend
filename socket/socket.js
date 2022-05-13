const sio = require("../config/socket");
const logger = require("../config/logger");
const neo4j = require("neo4j-driver")

const AuthenticationError = require("passport/lib/errors/authenticationerror");
const { authenticationCheck, wrapMiddleware, parseIdQuery } = require("../utils/middlewares");
const { neo4jQueryWrapper } = require("../utils/utils");
const { NotFoundError } = require("../utils/errors");

const authenticationCheckWrapped = wrapMiddleware(authenticationCheck);

const parseIdQueryWrapped = payload => {
  payload.id = `${payload.id}`
  return parseIdQuery({query: payload}, null, () => {})
}

const getId = (socket) => socket.nsp.name.split("/").slice(-1)[0];

sio
  .of("/")
  .use((socket, next) => next(new AuthenticationError("apiUnauthorizedError")));

const uuidRegex =
  "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const idRegex = "\\d+"

const wrapNamespaceRegex = namespace => new RegExp(`^${namespace}$`)

sio
  .of(wrapNamespaceRegex(`/user/${idRegex}`))
  .use(authenticationCheckWrapped)
  .use((socket, next) => {
    const sessionUserID = socket.request.user._id.toString();
    const idNamespace = getId(socket);
    neo4jQueryWrapper("MATCH (u:User{sessionUserID:$sessionUserID}) RETURN u", {
      sessionUserID,
    })
      .then(({ records: [record] }) => {
        const id = record.get("u").properties.id;
        if (id !== idNamespace) {
          throw new AuthenticationError("apiUnauthorizedError");
        }
        next();
      })
      .catch((err) => next(err));
  });

sio
  .of(wrapNamespaceRegex(`/chat/${uuidRegex}`))
  .use(authenticationCheckWrapped)
  .use((socket, next) => {
    const sessionUserID = socket.request.user._id.toString();
    const id = getId(socket);
    neo4jQueryWrapper(
      "MATCH (u:User{sessionUserID:$sessionUserID})-[:JOINED]->(c:Conversation{id:$id}) RETURN c",
      { sessionUserID, id }
    )
      .then(({ records }) => {
        if (!records.length) {
          throw new NotFoundError("apiChatNotFoundError");
        }
        next();
      })
      .catch((err) => next(err));
  })
  .on("connection", (socket) => {
    const id = getId(socket);

    socket.on("info", (...args) => {
      const callback = args.slice(-1)[0];
      neo4jQueryWrapper(
        "MATCH (c:Conversation{id:$id})<-[:JOINED]-(u:User) RETURN c, u",
        { id }
      )
        .then(({ records }) => {
          const { id: conversationId } = records[0].get("c").properties;
          const users = records.reduce((result, record) => {
            const {
              id: userId,
              login: userLogin,
              nameFirst: userNameFirst,
              nameLast: userNameLast,
              avatar: userAvatar,
            } = record.get("u").properties;
            return [
              ...result,
              {
                id: userId,
                login: userLogin,
                nameFirst: userNameFirst,
                nameLast: userNameLast,
                avatar: userAvatar,
              },
            ];
          }, []);
          callback({ conversationId, users });
        })
        .catch((err) => logger.error(err));
    });

    socket.on("history", (...args) => {
      const payload = args[0] ?? {}
      parseIdQueryWrapped(payload)
      const {id: idMessage} = payload;
      const callback = args.slice(-1)[0];
      
      neo4jQueryWrapper(
        `MATCH (c:Conversation{id:$id}) OPTIONAL MATCH (c)<-[:SENT_TO]-(m:Message)<-[:SENT]-(u:User) ${
          idMessage!==undefined ? "WHERE m.id < $idMessage" : ""
        } RETURN c, m, u ORDER BY m.date DESC LIMIT 15`,
        { id, idMessage }
      )
        .then(({ records }) => {
          const { id: conversationId } = records[0].get("c").properties;
          const messages = records.reduce((result, record) => {
            if (record.get("m")) {
              const {
                id: userId,
                login: userLogin,
                nameFirst: userNameFirst,
                nameLast: userNameLast,
                avatar: userAvatar,
              } = record.get("u").properties;
              const {
                message,
                id: messageId,
                date,
              } = record.get("m").properties;

              const messageJson = {
                user: {
                  id: userId,
                  login: userLogin,
                  nameFirst: userNameFirst,
                  nameLast: userNameLast,
                  avatar: userAvatar,
                },
                message,
                messageId,
                date,
                conversationId,
              };

              result.push(messageJson);
            }
            return result;
          }, []);
          callback({ messages });
        })
        .catch((err) => logger.error(err));
    });

    socket.on("message", (...args) => {
      const sessionUserID = socket.request.user._id.toString();
      const conversationID = id;

      const { message } = args[0];
      const callback = args.slice(-1)[0];

      neo4jQueryWrapper(
        "MATCH (mc:MessageCounter), (u:User {sessionUserID: $sessionUserID})-[:JOINED]->(c:Conversation {id: $conversationID}) CALL apoc.atomic.add(mc,'next',1) YIELD oldValue AS next CREATE (u)-[:SENT]->(m:Message:ID {id: next, message: $message, date: datetime()})-[:SENT_TO]->(c) RETURN u, c, m",
        {
          sessionUserID,
          conversationID,
          message,
        }
      )
        .then(({ records: [record] }) => {
          const {
            id: userId,
            login: userLogin,
            nameFirst: userNameFirst,
            nameLast: userNameLast,
            avatar: userAvatar,
          } = record.get("u").properties;
          const { message, id: messageId, date } = record.get("m").properties;
          const { id: conversationId } = record.get("c").properties;

          const messageJson = {
            user: {
              id: userId,
              login: userLogin,
              nameFirst: userNameFirst,
              nameLast: userNameLast,
              avatar: userAvatar,
            },
            message,
            messageId,
            date,
            conversationId,
          };

          socket.emit("message", messageJson); // remove
          // callback(messageJson)
          socket.broadcast.emit("message", messageJson);
        })
        .catch((err) => logger.error(err));
    });
  });

logger.info("WebSocket initialized!");

module.exports = sio;
