const sio = require("../config/socket");
const logger = require("../config/logger");

const AuthenticationError = require("passport/lib/errors/authenticationerror");
const {
  authenticationCheck,
  wrapMiddleware,
  parseIdQuery,
  parseIdParam,
} = require("../utils/middlewares");
const { neo4jQueryWrapper, getCallback } = require("../utils/utils");
const { NotFoundError } = require("../utils/errors");
const { idRegexString } = require("../utils/constants");

const authenticationCheckWrapped = wrapMiddleware(authenticationCheck);

const parseIdQueryWrapped = wrapMiddleware(parseIdQuery);

const parseIdParamWrapped = (socket, next) => {
  const id = socket.nsp.name.split("/").slice(-1)[0];
  socket.request.params = { id };
  return wrapMiddleware(parseIdParam)(socket, next);
};

sio
  .of("/")
  .use((socket, next) => next(new AuthenticationError("apiUnauthorizedError")));

const wrapNamespaceRegex = (namespace) => new RegExp(`^${namespace}$`);

sio
  .of(wrapNamespaceRegex(`/user/${idRegexString}`))
  .use(authenticationCheckWrapped)
  .use(parseIdParamWrapped)
  .use((socket, next) => {
    const sessionUserID = socket.request.user._id.toString();
    const { id: idNamespace } = socket.request.params;
    neo4jQueryWrapper("MATCH (u:User{sessionUserID:$sessionUserID}) RETURN u", {
      sessionUserID,
    })
      .then(({ records: [record] }) => {
        const id = record.get("u").properties.id;
        if (id !== idNamespace.toNumber()) {
          throw new AuthenticationError("apiUnauthorizedError");
        }
        next();
      })
      .catch((err) => next(err));
  })
  .on("connection", (socket) => {
    socket.emit("connected", `Connected to private socket ${socket.nsp.name}`);
  });

sio
  .of(wrapNamespaceRegex(`/chat/${idRegexString}`))
  .use(authenticationCheckWrapped)
  .use(parseIdParamWrapped)
  .use((socket, next) => {
    const sessionUserID = socket.request.user._id.toString();
    const { id } = socket.request.params;

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
    const { id } = socket.request.params;

    socket
      .on("info", (...args) => {
        const callback = getCallback(args);
        if (!callback) {
          return;
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
        const callback = getCallback(args);
        if (!callback) {
          return;
        }

        const payloadId = args[0].id;
        const socketDummy = {
          request: {
            query: {
              id: payloadId !== undefined ? `${payloadId}` : undefined,
            },
          },
        };
        const nextDummy = (error) => {
          socketDummy.error = error;
        };
        parseIdQueryWrapped(socketDummy, nextDummy);
        if (socketDummy.error) {
          return;
        }

        const { id: idMessage } = socketDummy.request.query;

        neo4jQueryWrapper(
          `MATCH (c:Conversation{id:$id}) OPTIONAL MATCH (c)<-[:SENT_TO]-(m:Message)<-[:SENT]-(u:User) ${
            idMessage !== undefined ? "WHERE m.id < $idMessage" : ""
          } RETURN c, m, u ORDER BY m.date DESC LIMIT 60`,
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

        const sessionUserID = socket.request.user._id.toString();
        neo4jQueryWrapper(
          "MATCH (c:Conversation{id:$id})<-[r:UNREAD]-(u:User {sessionUserID:$sessionUserID}) DELETE r RETURN c, u",
          { sessionUserID, id }
        )
          .then(({ records: [record] }) => {
            if (record) {
              const userId = record.get("u").properties.id;

              sio.of(`/user/${userId}`).emit("readConversation");
            }
          })
          .catch((err) => logger.error(err));
      })
      .on("message", (...args) => {
        const callback = getCallback(args);
        if (!callback) {
          return;
        }

        const sessionUserID = socket.request.user._id.toString();
        const conversationID = id;

        const message = args[0].message;

        neo4jQueryWrapper(
          "MATCH (mc:MessageCounter), (u:User {sessionUserID: $sessionUserID})-[:JOINED]->(c:Conversation {id: $conversationID}) CALL apoc.atomic.add(mc,'next',1) YIELD oldValue AS next CREATE (u)-[:SENT]->(m:Message {id: next, message: $message, date: datetime()})-[:SENT_TO]->(c) RETURN u, c, m",
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

            const onlyUser = [...sio.of(socket.nsp.name).sockets].reduce(
              (result, [_, socket]) => {
                return result && socket.request.user.login === userLogin;
              },
              true
            );

            if (onlyUser) {
              neo4jQueryWrapper(
                "MATCH (u:User{sessionUserID:$sessionUserID})-[:JOINED]->(c:Conversation{id:$id})<-[:JOINED]-(u2:User) MERGE (u2)-[:UNREAD]->(c) RETURN u2",
                { sessionUserID, id }
              )
                .then(({ records: [record] }) => {
                  const friendId = record.get("u2").properties.id;

                  sio
                    .of(`/user/${friendId}`)
                    .emit(
                      "newMessage",
                      `{"friendId": ${friendId}, "chatId": ${id}}`
                    );
                })
                .catch((err) => next(err));
            }

            socket.broadcast.emit("message", messageJson);
            callback(messageJson);
          })
          .catch((err) => logger.error(err));
      })
      .on("messageRemove", (...args) => {
        const callback = getCallback(args);
        if (!callback) {
          return;
        }

        const sessionUserID = socket.request.user._id.toString();

        const payloadId = args[0].id;
        const socketDummy = {
          request: {},
          nsp: {
            name: `${payloadId}`,
          },
        };
        const nextDummy = (error) => {
          socketDummy.error = error;
        };
        parseIdParamWrapped(socketDummy, nextDummy);
        if (socketDummy.error) {
          return;
        }

        const { id: idMessage } = socketDummy.request.params;

        neo4jQueryWrapper(
          "MATCH (u:User {sessionUserID: $sessionUserID})-[:SENT]->(m:Message {id: $idMessage})-[:SENT_TO]->(c:Conversation {id: $id}) WITH m, properties(m) AS mm DETACH DELETE m RETURN mm",
          {
            sessionUserID,
            idMessage,
            id,
          }
        )
          .then(({ records: [record] }) => {
            if (!record) {
              throw new NotFoundError("apiMessageNotFoundError");
            }
            const message = record.get("mm");

            const payload = { id: message.id };
            socket.broadcast.emit("messageRemove", payload);
            callback(payload);
          })
          .catch((err) => logger.error(err));
      });
  });

logger.info("Socket.IO initialized");

module.exports = sio;
