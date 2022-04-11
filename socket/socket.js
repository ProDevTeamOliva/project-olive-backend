const sio = require("../config/socket");
const logger = require("../config/logger");

const AuthenticationError = require("passport/lib/errors/authenticationerror");
const { authenticationCheck, wrapMiddleware } = require("../utils/middlewares");
const {neo4jQueryWrapper} = require("../utils/utils");
const { NotFoundError } = require("../utils/errors");

const authenticationCheckWrapped = wrapMiddleware(authenticationCheck);

const getId = (socket) => socket.nsp.name.split("/")[2];

sio.of("/").use((socket, next) => next(new AuthenticationError("apiUnauthorizedError")))

const uuidRegex = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}"

sio.of(new RegExp(`^/user/${uuidRegex}$`))
    .use(authenticationCheckWrapped)
    .use((socket, next) => {
        const sessionUserID = socket.request.user._id.toString()
        const idNamespace = getId(socket)
        neo4jQueryWrapper("MATCH (u:User{sessionUserID:$sessionUserID}) RETURN u", {sessionUserID})
            .then(({records: [record]}) => {
                const id = record.get("u").properties.id
                if(id !== idNamespace) {
                    throw new AuthenticationError("apiUnauthorizedError")
                }
                next()
            })
            .catch(err => next(err))
    });

sio.of(new RegExp(`^/chat/${uuidRegex}$`))
    .use(authenticationCheckWrapped)
    .use((socket, next) => {
        const sessionUserID = socket.request.user._id.toString()
        const id = getId(socket)
        neo4jQueryWrapper(
            "MATCH (u:User{sessionUserID:$sessionUserID})-[:JOINED]->(c:Conversation{id:$id}) RETURN c",
            {sessionUserID, id}

        ).then(({records}) => {
            if(!records.length) {
                throw new NotFoundError("apiChatNotFoundError")
            }
            next()

        }).catch(err => next(err))
    })
    .on("connection", socket => {
        const id = getId(socket)

        socket.on("history", (...args) => {
            const callback = args[args.length-1]
            neo4jQueryWrapper(
                "MATCH (c:Conversation{id:$id}) OPTIONAL MATCH (c)<-[:SENT_TO]-(m:Message)<-[:SENT]-(u:User) RETURN c, m, u ORDER BY m.date DESC",
                {id}

            ).then(({records}) => {
                const conversation = records[0].get("c").properties
                const messages = records.reduce((result, record) => {
                    const messageNode = record.get("m")
                    if(messageNode) {
                        const message = messageNode.properties
                        const user = record.get("u").properties
                        user.sessionUserID = undefined
                        message.user = user
                        result.push(message)
                    }
                    return result
                }, [])
                conversation.messages = messages
                callback(conversation)
            })
        })
    })

logger.info("WebSocket initialized!");

module.exports = sio;
