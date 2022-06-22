const {v4} = require("uuid")

// var cookies = []

const generateLogin = (context, ee, next) => {
    context.vars.login = v4().replace(/-/g, "").slice(0, 20)
    return next()
}

// const afterResponseHandler = (requestParams, response, context, ee, next) => {
//     context.vars.cookie = response.headers["set-cookie"]
//     // console.log(context.vars);
//     return next()
// }

// const getRandomCookie = (requestParams, context, ee, next) => {
//     console.log(context.vars);
//     return next()
// }

module.exports = {
    generateLogin,
    // afterResponseHandler,
    // getRandomCookie
}
