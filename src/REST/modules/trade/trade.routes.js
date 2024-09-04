const authenticate = require("../../../common/auth.guard")
const tradeController = require("./trade.controller")

const router = require("express").Router()

router.post("/order", authenticate, tradeController.processOrder)
router.get("/orderbook", authenticate, tradeController.getOrderBook)
router.get("/history", authenticate, tradeController.getTradeHistory)
router.get("/analytics", authenticate, tradeController.getTradeAnalytics)
router.get("/portfolio", authenticate, tradeController.getPortfolio)

module.exports = {
    tradeRoutes : router
}