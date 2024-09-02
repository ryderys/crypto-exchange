const authenticate = require("../../../common/auth.guard")
const tradeController = require("./trade.controller")

const router = require("express").Router()

router.post("/buy-crypto", authenticate, tradeController.buyOrder)
router.post("/sell-crypto", authenticate, tradeController.sellOrder)

module.exports = {
    tradeRoutes : router
}