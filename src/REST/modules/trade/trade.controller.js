const autoBind = require("auto-bind")
const TradeService = require("../trade/trade.service")
const {logger} = require("../../../common/utils")
class TradeController{
    #service
    constructor(){
        autoBind(this)
        this.#service = TradeService
    }

    #sendResponse(res, statusCode, message, data = {}) {
        return res.status(statusCode).json({
            statusCode,
            data: {
                message,
                ...data
            }
        });
    }
    
    async processOrder(req, res, next){
        try {
            const userId = req.user.id
            const {walletId, crypto , amount, currency, type, orderType, targetPrice} = req.body;

            const result = await this.#service.processOrder(userId, walletId, crypto, amount, currency , type, orderType, targetPrice)
            return this.#sendResponse(res, 200, 'order created successfully ', result)
        } catch (error) {
            logger.error(`Error processing order: ${error.message}`);
            next(error)
        }
    }


    async getOrderBook(req, res, next){
        try {
            const {crypto} = req.query //crypto symbol from query params
            console.log(crypto);
            
            const orderBook = await this.#service.getOrderBook(crypto)
            return this.#sendResponse(res, 200,'order book fetched', orderBook)
        } catch (error) {
            logger.error(`Error fetching order book: ${error.message}`);
            next(error)
        }
    }
    async getTradeHistory(req, res, next){
        try {
            const userId = req.user.id; //crypto symbol from query params
            const tradeHistory = await this.#service.getTradeHistory(userId)
            return this.#sendResponse(res, 200,'trade history fetched', tradeHistory)
        } catch (error) {
            logger.error(`Error fetching trade history: ${error.message}`);
            next(error)
        }
    }
    async getTradeAnalytics(req, res, next){
        try {
            const userId = req.user.id; //crypto symbol from query params
            const analytics = await this.#service.getTradeAnalytics(userId)
            return this.#sendResponse(res, 200,'trade analytics fetched', analytics)
        } catch (error) {
            logger.error(`Error fetching trade analytics: ${error.message}`);
            next(error)
        }
    }
    async getPortfolio(req, res, next){
        try {
            const userId = req.user.id; //crypto symbol from query params
            const portfolio = await this.#service.getPortfolio(userId)
            return this.#sendResponse(res, 200,'portfolio fetched', portfolio)
        } catch (error) {
            logger.error(`Error fetching portfolio: ${error.message}`);
            next(error)
        }
    }

    async processMultiCurrencyOrder(req, res, next){
        try {
            const userId = req.user.id
            const { walletId, fromCurrency, toCurrency, amount, type } = req.body;
            const result = await this.#service.processMultiCurrencyOrder(userId, walletId, fromCurrency, toCurrency, amount, type);
            return this.#sendResponse(res, 200, "Multi-currency order processed successfully", result);      
        } catch (error) {
            next(error)
        }
    }
    
}

module.exports = new TradeController()