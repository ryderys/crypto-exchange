const autoBind = require("auto-bind");
const { default: BigNumber } = require("bignumber.js");
const { sequelize } = require("../../../../config/sequelize");
const walletService = require("../wallet/wallet.service");
const MarketService = require("../market/market.service")
const TradeSchema = require("./trade.model");
const WalletSchema = require("../wallet/wallet.model");
const AuditLog = require("../transactions/auditLog.schema");
const { Op } = require("sequelize");
const TransactionSchema = require("../transactions/transactions.model");
const { logger } = require("../../../common/utils");
const LimitOrder = require("../order/limitOrder.model");
const fiatCurrencies = ['USD', 'EUR', 'GBP']; // List of fiat currencies
const cryptoPrecision = 8;
const fiatPrecision = 2;
class TradingService {
    #WalletService
    #model
    #limitOrder_model
    #wallet_model
    #auditLog_model
    #transaction_model
    #marketService
    constructor(){
        autoBind(this)
        this.#WalletService = walletService
        this.#model = TradeSchema
        this.#wallet_model = WalletSchema
        this.#auditLog_model = AuditLog
        this.#transaction_model = TransactionSchema
        this.#marketService = MarketService
        this.#limitOrder_model = LimitOrder

    }
    async logAuditAction(userId, action, transaction = null){
        const auditLog = await this.#auditLog_model.create({
            action,
            userId
        }, {transaction})
        return auditLog
    }

    
    async processOrder(userId, walletId, crypto, amount, currency, type, orderType = 'market', targetPrice = null){
        return sequelize.transaction(async (t) => {
            if (!crypto || !currency) throw new ValidationError("Invalid parameters: crypto and currency are required.");
    
            const standardizedCurrency = currency.toUpperCase();
            const cryptoKey = crypto.toLowerCase();
    
            const validAmount = this.#validateAmount(amount);
            let wallet = await this.#findOrCreateWallet(userId, walletId, standardizedCurrency, t);
            
            if(orderType === 'limit' || orderType === 'stop'){
                if(!targetPrice) throw new Error("Target price required for limit/stop orders.")
                await this.#createLimitOrStopOrder(userId, walletId, cryptoKey, validAmount, targetPrice, orderType, t)
                return { message: `${orderType.charAt(0).toUpperCase() + orderType.slice(1)} order placed`}
            }

            if (type === 'buy') {
                return this.#processBuyOrder(wallet, validAmount, standardizedCurrency, cryptoKey, t);
            } else if (type === 'sell') {
                return this.#processSellOrder(wallet, validAmount, standardizedCurrency, cryptoKey, t);
            } else {
                throw new ValidationError("Invalid order type. Must be 'buy' or 'sell'.");
            }
        });
    }

    async checkPendingOrder(crypto, currentPrice){
        const limitOrders = await this.#limitOrder_model.findAll({where: {crypto, status: 'open'}})

        for (const order of limitOrders) {
            if(order.type === 'limit' && currentPrice >= order.price){
                await this.#executeLimitOrder(order)
            }    
            else if(order.type === 'stop' && currentPrice <= order.price){
                await this.#executeStopOrder(order)
            }    
        }
    }

    async getOrderBook(crypto){
        const buyOrders = await this.#limitOrder_model.findAll({
            where: {crypto, type: 'buy', status: 'open'},
            order: [['price', 'DESC']]
        })
        const sellOrders = await this.#limitOrder_model.findAll({
            where: {crypto, type: 'sell', status: 'open'},
            order: [['price', 'ASC']]
        })
        return {
            buyOrders, 
            sellOrders
        }
    }

    async getTradeHistory(userId){
        const trades = await this.#transaction_model.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']]
        })
        return trades
    }

    async getTradeAnalytics(userId){
        const trades = await this.getTradeHistory(userId);

        let totalProfit = new BigNumber(0);
        let totalVolume = new BigNumber(0)

        trades.forEach(trade => {
            const tradeValue = new BigNumber(trade.amount)
            if(trade.type === 'sell'){
                totalProfit = totalProfit.plus(tradeValue)
            }
            totalVolume = totalVolume.plus(tradeValue)
        })

        return {
            totalProfit: totalProfit.toFixed(2),
            totalVolume: totalVolume.toFixed(2)
        }
    }

    async processMultiCurrencyOrder(userId, walletId, fromCurrency, toCurrency, amount, type){
        const exchangeRate = await this.#marketService.getExchangeRate(fromCurrency, toCurrency)
        const convertedAmount = new BigNumber(amount).multipliedBy(exchangeRate)

        const wallet = await this.#findOrCreateWallet(userId, walletId, fromCurrency)

        if(type === 'buy'){
            this.#checkSufficientBalance(wallet, fromCurrency, amount)
            this.#updateBalance(wallet, fromCurrency, amount.negated())
            this.#updateBalance(wallet, toCurrency, convertedAmount)
        } else if(type === 'sell'){
            this.#checkSufficientBalance(wallet, toCurrency, convertedAmount)
            this.#updateBalance(wallet, toCurrency, convertedAmount.negated())
            this.#updateBalance(wallet, fromCurrency, convertedAmount)
        }
        await wallet.save()
    }

    async calculateFees(userId, tradeAmount, tradeType){
        let feePercentage;

        if (tradeType === 'buy'){
            feePercentage = 0.01; // 1% fee for buys
        } else if (tradeType === 'sell'){
            feePercentage = 0.015; // 1.5% fee for buys
        }
        const fee = new BigNumber(tradeAmount).multipliedBy(feePercentage)
        return fee
    }

    async #executeLimitOrder(order){
        const wallet = await this.#findOrCreateWallet(order.userId, order.walletId, order.crypto)    
        await this.#processBuyOrder(wallet, order.amount, 'USD', order.crypto, sequelize.transaction())
        order.status = 'executed'
        await order.save()
    }
    async #executeStopOrder(order){
        const wallet = await this.#findOrCreateWallet(order.userId, order.walletId, order.crypto)    
        await this.#processSellOrder(wallet, order.amount, 'USD', order.crypto, sequelize.transaction())
        order.status = 'executed'
        await order.save()
    }

    async#createLimitOrStopOrder(userId, walletId, crypto, amount, targetPrice, orderType, transaction){
        await this.#limitOrder_model.create({
            userId,
            walletId,
            crypto,
            amount: amount.toFixed(cryptoPrecision),
            price: targetPrice.toFixed(fiatPrecision),
            type: orderType,
            status: 'open',
        }, {transaction})
    }

    async getPortfolio(userId){
        const wallet = await this.getDefaultWallet(userId, 'USD')
        const portfolio = []

        for (const [currency, balance] of Object.entries(wallet.balances)) {
            const currentPrice = await this.#marketService.getCoinPrice(currency, 'USD')
            const value = new BigNumber(balance).multipliedBy(currentPrice)
            portfolio.push({currency, balance, value: value.toFixed(2)})
        }
        
        const totalValue = portfolio.reduce((acc, asset) => acc.plus(asset.value), new BigNumber(0))
        portfolio.forEach(asset => {
            asset.percentageAllocation = new BigNumber(asset.value).dividedBy(totalValue).multipliedBy(100).toFixed(2)
        })
        return {
            totalValue: totalValue.toFixed(2),
            assets: portfolio
        }
    }


    async #processBuyOrder(wallet, validAmount, standardizedCurrency, cryptoKey, transaction) {
        const rate = await this.#marketService.getCoinPrice(cryptoKey, standardizedCurrency.toLowerCase());
        const totalCost = validAmount.multipliedBy(rate);
    
        this.#checkSufficientBalance(wallet, standardizedCurrency, totalCost);
        
        this.#updateBalance(wallet, standardizedCurrency, totalCost.negated());
        this.#updateBalance(wallet, cryptoKey, validAmount);
        await wallet.save({ transaction });
        
        return this.#finalizeOrder(wallet, 'buy', validAmount, standardizedCurrency, totalCost, cryptoKey, transaction);
    }
    
    async #processSellOrder(wallet, validAmount, standardizedCurrency, cryptoKey, transaction) {
        const rate = await this.#marketService.getCoinPrice(cryptoKey, standardizedCurrency.toLowerCase());
        const totalValue = validAmount.multipliedBy(rate);
        
        this.#checkSufficientBalance(wallet, cryptoKey, validAmount);
        
        this.#updateBalance(wallet, cryptoKey, validAmount.negated());
        this.#updateBalance(wallet, standardizedCurrency, totalValue);
        await wallet.save({ transaction });
        
        return this.#finalizeOrder(wallet, 'sell', validAmount, standardizedCurrency, totalValue, cryptoKey, transaction);
    }

    async #finalizeOrder(wallet, type, validAmount, standardizedCurrency, totalValue, cryptoKey, transaction) {
        await this.#transaction_model.create({
            userId: wallet.userId,
            walletId: wallet.id,
            type,
            currency: standardizedCurrency,
            amount: totalValue.toFixed(fiatPrecision),
            crypto: cryptoKey,
            cryptoAmount: validAmount.toFixed(cryptoPrecision),
            status: 'completed'
        }, { transaction });
        
        return { wallet };
    }

    async #validateAmount(amount){
        const validAmount = new BigNumber(amount);
            if (validAmount.isNaN() || validAmount.lte(0)) {
                throw new Error("Invalid amount provided. Please provide a valid number greater than zero.");
            }
        return validAmount
    } 

    async getDefaultWallet(userId, currency){
        const wallet = await this.#wallet_model.findOne({where: { userId, balances: { [currency]: {[Op.gt]: 0} }}})
        if(!wallet) throw new Error('No wallet found with sufficient balance for this currency')
        return wallet
    }

    async #findOrCreateWallet(userId, currency, transaction){
        let wallet = await this.#wallet_model.findOne({
            where: { userId, [`balances.${currency}`]: { [Op.gt]: 0 } }, 
            transaction
        });
        
        if (!wallet) {
            wallet = await this.#wallet_model.create({
                userId,
                walletName: `${currency} Wallet`,
                balances: { [currency]: '0.00' },  // Initialize with zero balance
            }, { transaction });
        }
        
        return wallet;
    }

  

    #checkSufficientBalance(wallet, currency, amount) {
        const balance = new BigNumber(wallet.balances[currency] || 0);
        if (balance.lt(amount)) {
            throw new Error(`Insufficient balance. You have ${balance.toFixed(2)} ${currency} but tried to process ${amount.toFixed(2)} ${currency}.`);
        }
    }

    #updateBalance(wallet, currency, amount) {
        const currentBalance = new BigNumber(wallet.balances[currency] || 0);
        const newBalance = currentBalance.plus(amount);
        const precision = fiatCurrencies.includes(currency.toUpperCase()) ? fiatPrecision : cryptoPrecision;

        wallet.balances[currency] = newBalance.toFixed(precision);
        wallet.changed('balances', true);
        logger.info(`Updated balance for ${currency}: ${newBalance}`);
    }


}
module.exports = new TradingService()