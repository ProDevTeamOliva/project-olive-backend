const { Server } = require("socket.io");
const passport = require("passport");
const expressSession = require("./session");
const { wrapMiddleware } = require("../utils/middlewares");
const originHost = require("./originHost");
const server = require("./server");

const sio = new Server(server, {
    cors: {
        origin: originHost,
        credentials: true
    }
});

sio.ofOriginal = sio.of;

sio.of = function (namespaceName) {
    const namespace = this.ofOriginal(namespaceName)
    namespace.use(wrapMiddleware(expressSession))
    namespace.use(wrapMiddleware(passport.initialize()))
    namespace.use(wrapMiddleware(passport.session()))
    return namespace
};

module.exports = sio;
