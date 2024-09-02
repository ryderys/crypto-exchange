const { authRouter } = require("./REST/modules/auth/auth.routes")
const {marketRoutes} = require("./REST/modules/market/market.routes")
const {tradeRoutes} = require("./REST/modules/trade/trade.routes")
const { walletRouter } = require("./REST/modules/wallet/wallet.routes")

const router = require("express").Router()

router.use('/auth', authRouter)
router.use('/wallet', walletRouter)
router.use('/market', marketRoutes)
router.use('/trade', tradeRoutes)

module.exports = {
    AllRoutes: router
}