const { authRouter } = require("./REST/modules/auth/auth.routes")
const {marketRoutes} = require("./REST/modules/market/market.routes")
const { walletRouter } = require("./REST/modules/wallet/wallet.routes")

const router = require("express").Router()

router.use('/auth', authRouter)
router.use('/wallet', walletRouter)
router.use('/market', marketRoutes)

module.exports = {
    AllRoutes: router
}