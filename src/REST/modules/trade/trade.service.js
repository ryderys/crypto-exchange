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
const  {logger}  = require("../../../common/utils");
const LimitOrder = require("../order/limitOrder.model");
const { ValidationError, ExternalAPIError } = require("../error.handling");

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
        try {
            return sequelize.transaction(async (t) => {
                if (!crypto || !currency) throw new Error("Invalid parameters: crypto and currency are required.");
        
                const standardizedCurrency = currency.toLowerCase();
                const cryptoKey = crypto.toLowerCase();
                console.log(cryptoKey);
                
                const validAmount = await this.#validateAmount(amount);
                let wallet = await this.#findOrCreateWallet(userId, walletId, standardizedCurrency, t);
                
                if(orderType === 'limit' || orderType === 'stop'){
                    if(!targetPrice) throw new Error("Target price required for limit/stop orders.")
                    await this.#createLimitOrStopOrder(userId, walletId, cryptoKey, validAmount, targetPrice,type, orderType, t)
                    return { message: `${orderType.charAt(0).toUpperCase() + orderType.slice(1)} order placed`}
                }
    
                if (type === 'buy') {
                    return this.#processBuyOrder(wallet, validAmount, standardizedCurrency, cryptoKey, t);
                } else if (type === 'sell') {
                    return this.#processSellOrder(wallet, validAmount, standardizedCurrency, cryptoKey, t);
                } else {
                    throw new Error("Invalid order type. Must be 'buy' or 'sell'.");
                }
            });
        } catch (error) {
            logger.error(`Error processing order for user ${userId}: ${error.message}`);
            throw new Error(`Failed to process order: ${error.message}`);
        }
    }

    async checkPendingOrder(crypto, currentPrice){
        try {
            const limitOrders = await this.#limitOrder_model.findAll({where: {crypto, status: 'open'}})
            for (const order of limitOrders) {
                if(order.type === 'limit' && currentPrice >= order.price){
                    await this.#executeLimitOrder(order)
                }    
                else if(order.type === 'stop' && currentPrice <= order.price){
                    await this.#executeStopOrder(order)
            }    
        }
        } catch (error) {
            logger.error(`Error checking pending orders for ${crypto}: ${error.message}`);
            throw new Error(`Failed to check pending orders for ${crypto}: ${error.message}`);
        }
    }

    async getOrderBook(crypto){
        const buyOrders = await this.#limitOrder_model.findAll({
            where: {crypto, type: 'buy', status: 'open'},
            order: [['price', 'DESC']]
        })
        logger.info(`Buy orders: ${JSON.stringify(buyOrders)}`);
        const sellOrders = await this.#limitOrder_model.findAll({
            where: {crypto, type: 'sell', status: 'open'},
            order: [['price', 'ASC']]
        })
        logger.info(`Sell orders: ${JSON.stringify(sellOrders)}`);
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
            totalProfit: totalProfit.toString(),
            totalVolume: totalVolume.toString()
        }
    }

    async processMultiCurrencyOrder(userId, walletId, fromCurrency, toCurrency, amount, type){
        try {
            const exchangeRate = await this.#marketService.getExchangeRate(fromCurrency, toCurrency)
            const convertedAmount = new BigNumber(amount).multipliedBy(exchangeRate)

            const wallet = await this.#findOrCreateWallet(userId, walletId, fromCurrency)

            if (type === 'buy'){
                this.#checkSufficientBalance(wallet, fromCurrency, amount)
                this.#updateBalance(wallet, fromCurrency, amount.negated())
                this.#updateBalance(wallet, toCurrency, convertedAmount)
            } else if (type === 'sell'){
                this.#checkSufficientBalance(wallet, toCurrency, convertedAmount)
                this.#updateBalance(wallet, toCurrency, convertedAmount.negated())
                this.#updateBalance(wallet, fromCurrency, convertedAmount)
            }
            await wallet.save()
        } catch (error) {
            throw new Error(`Failed to process multi-currency order: ${error.message}`);
        }
    }

    async calculateFees(userId, tradeAmount, tradeType){
        let feePercentage;

        if (tradeType === 'buy'){
            feePercentage = 0.01; // 1% fee for buys
        } else if (tradeType === 'sell'){
            feePercentage = 0.015; // 1.5% fee for sells
        }
        const fee = new BigNumber(tradeAmount).multipliedBy(feePercentage)
        return fee
    }

    async #executeLimitOrder(order, transaction){
        const wallet = await this.#findOrCreateWallet(order.userId, order.walletId, order.crypto, transaction)    
        await this.#processBuyOrder(wallet, order.amount, 'USD', order.crypto, transaction)
        order.status = 'executed'
        await order.save({transaction})
    }
    async #executeStopOrder(order, transaction){
        const wallet = await this.#findOrCreateWallet(order.userId, order.walletId, order.crypto, transaction)    
        await this.#processSellOrder(wallet, order.amount, 'USD', order.crypto, transaction)
        order.status = 'executed'
        await order.save({transaction})
    }

    async #createLimitOrStopOrder(userId, walletId, crypto, amount, targetPrice,type, orderType, transaction){
        const bigTargetPrice = new BigNumber(targetPrice) ;

       const order =  await this.#limitOrder_model.create({
            userId,
            walletId,
            crypto,
            amount: amount.toFixed(cryptoPrecision),
            price: bigTargetPrice.toString(),
            type,
            orderType,
            status: 'open',
        }, {transaction})
        logger.info(`Created ${orderType} order: ${JSON.stringify(order)}`);
        return order
    }

    async getPortfolio(userId){
        try {
            const wallets = await this.#wallet_model.findAll({where: {userId}})
        if(!wallets){
            throw new Error("No wallet found for the user.")
        }
        const portfolio = []

        for (const wallet of wallets) {
            for (const [currency, balance] of Object.entries(wallet.balances)) {
                const currentPrice = await this.#marketService.getCoinPrice(currency, 'USD');
                const value = new BigNumber(balance).multipliedBy(currentPrice);
                portfolio.push({ currency, balance, value: value.toFixed(2) });
            }
        }
        
        const totalValue = portfolio.reduce((acc, asset) => acc.plus(new BigNumber(asset.value)), new BigNumber(0))

        portfolio.forEach(asset => {
            asset.percentageAllocation = new BigNumber(asset.value).dividedBy(totalValue).multipliedBy(100).toFixed(2)
        })
        return {
            totalValue: totalValue.toString(),
            assets: portfolio
        }
        } catch (error) {
            throw new Error(error)   
        }
    }


    async #processBuyOrder(wallet, validAmount, standardizedCurrency, cryptoKey, transaction) {
        try {
                const rate = await this.#marketService.getCoinPrice(cryptoKey, standardizedCurrency.toLowerCase());
               
                if (!rate || new BigNumber(rate).isNaN()) {
                    throw new Error(`Invalid or missing rate for ${cryptoKey} in ${standardizedCurrency}.`);
                }
                const totalCost = validAmount.multipliedBy(new BigNumber(rate)).toFixed(fiatPrecision);

                if (new BigNumber(totalCost).isNaN()) {
                    throw new Error(`Invalid total cost calculation for currency: ${standardizedCurrency} and crypto: ${cryptoKey}.`);
                }

                if (!wallet.balances[standardizedCurrency]) {
                    throw new Error(`Missing balance for currency: ${standardizedCurrency}`);
                }

                logger.info(`Current USD balance: ${wallet.balances[standardizedCurrency]}`);

                this.#checkSufficientBalance(wallet, standardizedCurrency, totalCost);
                
                const fee = await this.calculateFees(wallet.userId, totalCost, 'buy')

                this.#updateBalance(wallet, standardizedCurrency, new BigNumber(totalCost).plus(fee).negated());

                if (!wallet.balances[cryptoKey]) {
                    wallet.balances[cryptoKey] = '0.00'; // Initialize to zero if not present
                }
                
                
                // const fee = new BigNumber(totalCost).multipliedBy(0.01).toFixed(fiatPrecision)
                
                this.#updateBalance(wallet, cryptoKey, validAmount);
                await wallet.save({ transaction });
               return this.#finalizeOrder(wallet, 'buy', validAmount, standardizedCurrency, totalCost, cryptoKey, rate, fee, transaction);

            } catch (error) {
                if (error instanceof ValidationError) {
                    logger.error(`Validation error while processing buy order: ${error.message}`);
                    throw error;
                } else if (error instanceof ExternalAPIError) {
                    logger.error(`Error fetching price from external service: ${error.message}`);
                    throw new Error(`External API error while fetching ${cryptoKey} price: ${error.message}`);
                } else {
                    logger.error(`Unexpected error during buy order processing: ${error.message}`);
                    throw new Error(`Failed to process buy order for wallet ${wallet.id}: ${error.message}`);
                }
            }
    }
    
    async #processSellOrder(wallet, validAmount, standardizedCurrency, cryptoKey, transaction) {
        try {
            const rate = await this.#marketService.getCoinPrice(cryptoKey, standardizedCurrency.toLowerCase());
            if (!rate || new BigNumber(rate).isNaN()) {
                throw new Error(`Invalid or missing rate for ${cryptoKey} in ${standardizedCurrency}.`);
            }
            const totalValue = validAmount.multipliedBy(new BigNumber(rate));
            
            const fee = await this.calculateFees(wallet.userId, totalValue, 'sell')
            
            this.#checkSufficientBalance(wallet, cryptoKey, validAmount);
            
            
            this.#updateBalance(wallet, cryptoKey, new BigNumber(validAmount).negated());
            this.#updateBalance(wallet, standardizedCurrency, new BigNumber(totalValue).minus(fee));

            await wallet.save({ transaction });

            return this.#finalizeOrder(wallet, 'sell', validAmount, standardizedCurrency, totalValue, cryptoKey,rate, fee, transaction);
        } catch (error) {
            logger.error(`Error saving wallet: ${error.message}`);
            throw new Error(`Failed to save wallet with ID ${wallet.id}: ${error.message}`);

        }
        
    }
    
    async #finalizeOrder(wallet, type, validAmount, standardizedCurrency, totalValue, cryptoKey, price, fee, transaction) {
        const amount = new BigNumber(validAmount)
        const validPrice = new BigNumber(price)

        if (new BigNumber(validPrice).isNaN()) {
            throw new Error('Invalid price value.');
        }

        const validFee = new BigNumber(fee);
        if (new BigNumber(validFee).isNaN()) {
            throw new Error('Invalid fee value.');
        }

        const totalCost = new BigNumber(totalValue)
        if (new BigNumber(totalCost).isNaN()) {
            throw new Error('Invalid total cost value.');
        }
        if (!wallet.balances || !wallet.balances[standardizedCurrency]) {
            throw new Error(`Balance for ${standardizedCurrency} not found.`);
        }
    
        if (!wallet.balances[cryptoKey]) {
            throw new Error(`Balance for ${cryptoKey} not found.`);
        }
        await this.#transaction_model.create({
            userId: wallet.userId,
            walletId: wallet.id,
            type,
            currency: standardizedCurrency,
            price: validPrice.toString(),
            fee: validFee.toString(),
            amount: amount.toString(),
            crypto: cryptoKey,
            cryptoAmount: amount,
            status: 'completed'
        }, { transaction });
        
        return { 
            order: {
                id: transaction.id,
                type,
                crypto: cryptoKey,
                amount: amount, //.toFixed(cryptoPrecision)
                price: validPrice,
                totalCost,
                fee: validFee,
                timestamp: new Date().toISOString()
            },
            wallet: {
                id: wallet.id,
                walletName: wallet.walletName,
                balances: {
                    [standardizedCurrency]: new BigNumber(wallet.balances[standardizedCurrency]), //.toFixed(fiatPrecision),
                    [cryptoKey]: new BigNumber(wallet.balances[cryptoKey]) //.toFixed(cryptoPrecision)
                },
                userId: wallet.userId,
                isLocked: wallet.isLocked
            }
         };
    }

    async #validateAmount(amount){
       try {
        const validAmount = new BigNumber(amount);
        if (validAmount.isNaN() || validAmount.lte(0)) {
            throw new Error("Invalid amount provided. Please provide a valid number greater than zero.");
        }
        return validAmount
       } catch (error) {
        throw new ValidationError('Invalid amount provided')
       }
    } 

    async getDefaultWallet(userId, currency){
        const wallet = await this.#wallet_model.findOne({where: { userId, balances: { [currency]: {[Op.gt]: 0} }}})
        if(!wallet) throw new Error('No wallet found with sufficient balance for this currency')
        return wallet
    }

    async #findOrCreateWallet(userId, walletId, currency, transaction) {
        try {
            let wallet;
    
            // If a walletId is provided, try to find the wallet with that ID
            if (walletId) {
                wallet = await this.#wallet_model.findOne({
                    where: { id: walletId, userId },
                    transaction
                });
        
                if (!wallet) {
                    throw new ValidationError(`Wallet with ID ${walletId} not found for user ${userId}`);
                }
            } else {
                // If no walletId is provided, find any wallet for the user
                wallet = await this.#wallet_model.findOne({
                    where: { userId },
                    transaction
                });
            }
        
            // If no wallet is found, create a new one
            if (!wallet) {
                wallet = await this.#wallet_model.create({
                    userId,
                    walletName: `${currency.toLowerCase()} wallet`, // Name based on currency
                    balances: { [currency]: '0.00' }, // Initialize with zero balance for the currency
                }, { transaction });
        
                logger.info(`Created new wallet for user ${userId} with currency ${currency.toLowerCase()}`);
            }
        
            return wallet;
        } catch (error) {
            logger.error(`Error finding or creating wallet for user ${userId}: ${error.message}`);
            throw new Error(`Failed to find or create wallet: ${error.message}`);
        }
    }
    
    #checkSufficientBalance(wallet, currency, amount) {
        const balance = new BigNumber(wallet.balances[currency] || 0);
        if (balance.lt(amount)) {
            throw new Error(`Insufficient balance. You have ${balance.toString()} ${currency} but tried to process ${amount.toString()} ${currency}.`);
        }
    }

    #updateBalance(wallet, currency, amount) {
        try {
            const currentBalance = new BigNumber(wallet.balances[currency] || 0);
            const newBalance = currentBalance.plus(amount);
            const precision = fiatCurrencies.includes(currency.toLowerCase()) ? fiatPrecision : cryptoPrecision;

            wallet.balances[currency] = newBalance.toFixed(precision);
            wallet.changed('balances', true);
            logger.info(`Updated balance for ${currency}: ${newBalance}`);
        } catch (error) {
            throw new ValidationError("update balance failed ")
        }
    }


}
module.exports = new TradingService()