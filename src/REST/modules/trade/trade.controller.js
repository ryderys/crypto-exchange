const autoBind = require("auto-bind")
const TradeService = require("../trade/trade.service")
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
    
    async buyOrder(req, res, next){
        try {
            const userId = req.user.id
            const {walletId, crypto , amount, currency} = req.body;
            const trade = await this.#service.buyOrder(userId, walletId, crypto, amount, currency )
            return this.#sendResponse(res, 200, 'buy order completed successfully ', trade)
        } catch (error) {
            next(error)
        }
    }
    async sellOrder(req, res, next){
        try {
            const userId = req.user.id
            const {walletId, crypto , amount, currency} = req.body;
            const trade = await this.#service.sellOrder(userId, walletId, crypto, amount, currency )
            return this.#sendResponse(res, 200, 'sell order completed successfully ', trade)
        } catch (error) {
            next(error)
        }
    }
}