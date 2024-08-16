const { authRouter } = require("./REST/modules/auth/auth.routes")

const router = require("express").Router()

router.use('/auth', authRouter)

module.exports = {
    AllRoutes: router
}