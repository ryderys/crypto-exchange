const autoBind = require("auto-bind")
const marketService = require("./market.service")

class MarketController{
    #service
    constructor(){
        autoBind(this)
        this.#service = marketService
    }
    async getCoinList(req, res, next){
        try {
            const {page = 1, per_page = 20} = req.query
            const coinList = await this.#service.getCoinList(page, per_page)
            return res.status(200).json({coinList})
        } catch (error) {
            next(error)
        }
    }
    async getCoinMarketData(req, res, next){
        try {
            const {coinId, vsCurrency = 'usd', page = 1, per_page = 20} = req.query;
            if(!coinId){
                throw new Error("coinId is required")
            }
            const marketData = await this.#service.getCoinMarketData(coinId, vsCurrency, Number(page), Number(per_page))
            return res.status(200).json({marketData})
        } catch (error) {
            next(error)
        }
    }

    async getCoinHistoricalData(req, res, next){
        try {
            const {coinId, date,} = req.query;
            if(!coinId || !date){
                throw new Error("coinId and date are required")
            }
            const historicalData = await this.#service.getCoinHistoricalData(coinId,date )
            return res.status(200).json({historicalData})
        } catch (error) {
            next(error)
        }
    }
    async getCoinDataById(req, res, next){
        try {
            const {coinId} = req.query;
            if(!coinId){
                throw new Error("coinId is required")
            }
            const coinData = await this.#service.getCoinDataById(coinId )
            return res.status(200).json({coinData})
        } catch (error) {
            next(error)
        }
    }

    async getTrendingCoins(req, res, next){
        try {
            const {page = 1, per_page = 20} = req.query
            const trendingCoins = await this.#service.getTrendingCoins(Number(page), Number(per_page))
            return res.status(200).json({trendingCoins})
        } catch (error) {
            next(error)
        }
    }
    async getGlobalMarket(req, res, next){
        try {
            const globalMarket = await this.#service.getGlobalMarketData()
            return res.status(200).json({globalMarket})
        } catch (error) {
            next(error)
        }
    }
    async getSupportedCurrencies(req, res, next){
        try {
            const currencies = await this.#service.getSupportedCurrencies()
            return res.status(200).json({currencies})
        } catch (error) {
            next(error)
        }
    }
}

module.exports = new MarketController()