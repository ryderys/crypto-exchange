const autoBind = require("auto-bind")
const WalletService = require("./wallet.service")
class WalletController{
    #service
    constructor(){
        autoBind(this)
        this.#service = WalletService
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
    

    async createWallet(req, res, next) {
        try {
            const {currency, password} = req.body;
            const userId = req.user.id
            const wallet = await this.#service.createWallet(userId, currency, password)
            return this.#sendResponse(res, 201, 'Wallet created successfully', {wallet})
        } catch (error) {
            console.error(error)
            next(error)
        }
    }

    async getWalletByUserId(req, res, next){
        try {
            const userId = req.user.id;
            const wallets = await this.#service.getWalletByUserId(userId)
            return this.#sendResponse(res, 200, 'Wallet details fetched successfully', {wallets})
        } catch (error) {
            next(error)
        }
    }

    async depositByCurrency(req, res, next){
        try {
            const {currency, amount} = req.body;
            const userId = req.user.id
            
            const wallet = await this.#service.depositFundsByCurrency(userId,currency, +amount)
            return this.#sendResponse(res, 200, 'Funds deposited successfully', {wallet})
        } catch (error) {
            next(error)
        }
    }

    async withdrawFunds(req, res, next){
        try {
            const { walletId, amount, password} = req.body
            const wallet = await this.#service.withdrawFunds(walletId, amount, password)
            return this.#sendResponse(res, 200, 'Funds withdrawn successfully', {wallet})
        } catch (error) {
            next(error)
        }
    }

    async transferFunds(req, res, next){
        try {
            const { senderWalletId,recipientWalletId, amount, password} = req.body
            const {recipientWallet, senderWallet} = await this.#service.transferFunds(senderWalletId,recipientWalletId, amount, password)
            return this.#sendResponse(res, 200, 'Funds transferred successfully', {recipientWallet, senderWallet})
        } catch (error) {
            next(error)
        }
    }

    async getTransactionHistory(req, res, next){
        try {
            const { walletId} = req.params;
            const transactions = await this.#service.getTransactionHistory(walletId)
            return this.#sendResponse(res, 200, 'Transaction history fetched successfully', {transactions})
        } catch (error) {
            next(error)
        }
    }

    async checkBalance(req, res, next){
        try {
            const {walletId} = req.params
            const balance = await this.#service.checkBalance(walletId)
            return this.#sendResponse(res, 200, 'Balance fetched successfully', {balance})
        } catch (error) {
            next(error)
        }
    }

    async lockWallet(req, res, next){
        try {
            const {walletId} = req.body;
            const wallet = await this.#service.lockWallet(walletId)
            return this.#sendResponse(res, 200, 'Wallet locked successfully', { wallet })
        } catch (error) {
            next(error)
        }
    }
    async unlockWallet(req, res, next){
        try {
            const {walletId} = req.body;
            const wallet = await this.#service.unlockWallet(walletId)
            return this.#sendResponse(res, 200, 'Wallet unlocked successfully', { wallet })
        } catch (error) {
            next(error)
        }
    }
}

module.exports = new WalletController()