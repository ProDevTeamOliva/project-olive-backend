const sio = require("../config/socket");
const logger = require("../config/logger");

const AuthenticationError = require("passport/lib/errors/authenticationerror");
const { authenticationCheck, wrapMiddleware, parseIdQuery, parseIdParam } = require("../utils/middlewares");
const { neo4jQueryWrapper, getCallback } = require("../utils/utils");
const { NotFoundError } = require("../utils/errors");

const authenticationCheckWrapped = wrapMiddleware(authenticationCheck);

const parseIdQueryWrapped = wrapMiddleware(parseIdQuery)

const parseIdParamWrapped = (socket, next) => {
  const id = socket.nsp.name.split("/").slice(-1)[0]
  socket.request.params = {id}
  return wrapMiddleware(parseIdParam)(socket, next)
}

sio
  .of("/")
  .use((socket, next) => next(new AuthenticationError("apiUnauthorizedError")));

const idRegex = "([1-9]\\d*)|0"

const wrapNamespaceRegex = namespace => new RegExp(`^${namespace}$`)

sio
  .of(wrapNamespaceRegex(`/user/${idRegex}`))
  .use(authenticationCheckWrapped)
  .use(parseIdParamWrapped)
  .use((socket, next) => {
    const sessionUserID = socket.request.user._id.toString();
    const {id: idNamespace} = socket.request.params;
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
  .of(wrapNamespaceRegex(`/chat/${idRegex}`))
  .use(authenticationCheckWrapped)
  .use(parseIdParamWrapped)
  .use((socket, next) => {
    const sessionUserID = socket.request.user._id.toString();
    const {id} = socket.request.params;

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
    const {id} = socket.request.params;

    socket.on("info", (...args) => {
      const callback = getCallback(args)
      if(!callback) {
        return
      }

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

    })
    .on("history", (...args) => {
      const callback = getCallback(args)
      if(!callback) {
        return
      }

      const socketDummy = {request: {query: {
        id: `${args[0].id}`
      }}}
      const nextDummy = error => {
        socketDummy.error = error
      }
      parseIdQueryWrapped(socketDummy, nextDummy)
      if(socketDummy.error) {
        return
      }

      const {id: idMessage} = socketDummy.request.query;

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

    })
    .on("message", (...args) => {
      const callback = getCallback(args)
      // if(!callback) {
      //   return
      // }

      const sessionUserID = socket.request.user._id.toString();
      const conversationID = id;

      const { message } = args[0];

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
          socket.broadcast.emit("message", messageJson);
          // callback(messageJson)
        })
        .catch((err) => logger.error(err));
    });
  });

logger.info("WebSocket initialized!");

module.exports = sio;
