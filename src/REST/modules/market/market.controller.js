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
            const coinList = await this.#service.getCoinList()
            return res.status(200).json({coinList})
        } catch (error) {
            next(error)
        }
    }
    async getCoinMarketData(req, res, next){
        try {
            const {coinId, vsCurrency = 'usd'} = req.query;
            if(!coinId){
                throw new Error("coinId is required")
            }
            const marketData = await this.#service.getCoinMarketData(coinId, vsCurrency)
            return res.status(200).json({marketData})
        } catch (error) {
            next(error)
        }
    }

    async getCoinHistoricalData(req, res, next){
        try {
            const {coinId, date} = req.query;
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

    async getTrendingCoins(){
        try {
            const trendingCoins = await this.#service.getTrendingCoins()
            return res.status(200).json({trendingCoins})
        } catch (error) {
            next(error)
        }
    }
    async getGlobalMarket(){
        try {
            const globalMarket = await this.#service.getGlobalMarketData()
            return res.status(200).json({globalMarket})
        } catch (error) {
            next(error)
        }
    }
}

module.exports = new MarketController()