const sio = require("../config/socket");
const logger = require("../config/logger");

const AuthenticationError = require("passport/lib/errors/authenticationerror");
const { authenticationCheck, wrapMiddleware } = require("../utils/middlewares");

const authenticationCheckWrapped = wrapMiddleware(authenticationCheck);

const getId = (socket) => socket.nsp.name.split("/")[2];

// SAMPLE ENDPOINT
// ----
// sio.of(/^\/user\/$/).use(authenticationCheckWrapped).use((socket, next) => {
//     if (socket.request.user._id.toString() !== getId(socket)) {
//         return next(new AuthenticationError("apiUnauthorizedError"))
//     }
//     next()
// });
// ----

logger.info("WebSocket initialized!");

module.exports = sio;
