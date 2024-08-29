const marketController = require("./market.controller")

const router = require("express").Router()

router.get('/coins/list', marketController.getCoinList)
router.get('/supported-currencies', marketController.getSupportedCurrencies)
router.get('/coin-market-data' ,marketController.getCoinMarketData)

router.get('/coin-historical-data' ,marketController.getCoinHistoricalData)

router.get('/coin/:coinId' ,marketController.getCoinDataById)

router.get('/trending' ,marketController.getTrendingCoins)

router.get('/global' ,marketController.getGlobalMarket)

module.exports = {
    marketRoutes: router
}