const autoBind = require("auto-bind");
const { default: BigNumber } = require("bignumber.js");
const { sequelize } = require("../../../../config/sequelize");
const walletService = require("../wallet/wallet.service");
const TradeSchema = require("./trade.model");
const WalletSchema = require("../wallet/wallet.model");
const AuditLog = require("../transactions/auditLog.schema");
const { Op } = require("sequelize");
const TransactionSchema = require("../transactions/transactions.model");
const fiatCurrencies = ['USD', 'EUR', 'GBP']; // List of fiat currencies
const cryptoPrecision = 8;
const fiatPrecision = 2;
class TradingService {
    #WalletService
    #model
    #wallet_model
    #auditLog_model
    #transaction_model
    constructor(){
        autoBind(this)
        this.#WalletService = walletService
        this.#model = TradeSchema
        this.#wallet_model = WalletSchema
        this.#auditLog_model = AuditLog
        this.#transaction_model = TransactionSchema

    }
    async logAuditAction(userId, action, transaction = null){
        const auditLog = await this.#auditLog_model.create({
            action,
            userId
        }, {transaction})
        return auditLog
    }

    async getCoinPrice(crypto ,currency){   
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${crypto}&vs_currencies=${currency}`
        try {
            
            const response = await axios.get(url, {
                headers: {
                     accept: 'application/json',
                    'x-cg-demo-api-key': ' CG-A8496fii4gtpiNk6DEebo3ok '
                }
            })
            return response.data[crypto][currency]
        } catch (error) {
            console.error('Error fetching coin price:', error)
            throw new Error('Error fetching coin price');
        }
    }


    async buyOrder(userId, walletId, crypto, amount, currency){
        return sequelize.transaction(async (t) => {

            let wallet;
            if(walletId) {
                wallet = await this.#wallet_model.findOne({where: {id: walletId, userId}, transaction: t})
                if(!wallet) throw new Error(`Wallet with ID ${walletId} not found for user ${userId}.`)
            } else {
                wallet = await this.getDefaultWallet(userId, currency)
            }

            const rate = await this.getCoinPrice(crypto, currency)
            const totalCost = new BigNumber(amount).multipliedBy(rate).toFixed(2)

            this.#checkSufficientBalance(wallet, currency, totalCost)

            this.#updateBalance(wallet, currency, new BigNumber(totalCost).negated())

            this.#updateBalance(wallet, crypto, new BigNumber(amount))

            await wallet.save({transaction: t})
            // await cryptoWallet.save({transaction: t})

            await this.#transaction_model.create({
                userId,
                walletId: wallet.id,
                type: 'buy',
                currency,
                amount: totalCost,
                crypto,
                cryptoAmount: amount,
                status: 'completed'
            }, {transaction: t});
        
            return { wallet };
        
        } )
    }

    async sellOrder(userId, walletId, crypto, amount, currency) {
        return sequelize.transaction(async (t) => {
            let wallet;
            if(walletId) {
                wallet = await this.#wallet_model.findOne({where: {id: walletId, userId}, transaction: t})
                if(!wallet) throw new Error(`Wallet with ID ${walletId} not found for user ${userId}.`)
            } else {
                wallet = await this.getDefaultWallet(userId, currency)
            }
    
            // Step 2: Fetch the current price for the crypto in the specified currency
            const rate = await this.getCoinPrice(crypto, currency);
            const totalValue = new BigNumber(amount).multipliedBy(rate).toFixed(2);
    
            // Step 3: Check if the crypto wallet has sufficient balance
            this.#checkSufficientBalance(wallet, crypto, amount);

            this.#updateBalance(wallet, crypto, new BigNumber(amount).negated());
    
    
            this.#updateBalance(wallet, currency, new BigNumber(totalValue));
    
         
            await wallet.save({ transaction: t });
    
            // Step 8: Log the transaction with complete details
            await this.#transaction_model.create({
                userId,
                walletId: fiatWallet.id,
                type: 'sell',
                currency,
                amount: totalValue,
                crypto,
                cryptoAmount: amount,
                status: 'completed'
            }, { transaction: t });
    
            return { wallet };
        });
    }
    
    // async getOrCreateFiatWallet(userId, currency, transaction) {
    //     let fiatWallet = await this.#wallet_model.findOne({ where: { userId, currency }, transaction });
    //     if (!fiatWallet) {
    //         fiatWallet = await this.#wallet_model.create({
    //             userId,
    //             walletName: `${currency} Wallet`,
    //             balances: { [currency]: '0.00' },  // Initialize with zero balance
    //             currency
    //         }, { transaction });
    //     }
    //     return fiatWallet;
    // }
    

    async getDefaultWallet(userId, currency){
        const wallet = this.#wallet_model.findOne({where: { userId, balances: { [currency]: {[Op.gt]: 0} }}})
        if(!wallet) throw new Error('No wallet found with sufficient balance for this currency')
        return wallet
    }

    // async getOrCreateCryptoWallet(userId, crypto, transaction) {
    //     let cryptoWallet = await this.#wallet_model.findOne({ where: { userId, currency: crypto }, transaction });
    //     if (!cryptoWallet) {
    //         cryptoWallet = await this.#wallet_model.create({
    //             userId,
    //             walletName: `${crypto} Wallet`,
    //             balances: { [crypto]: '0.00' },  // Initialize with zero balance
    //             currency: crypto
    //         }, { transaction });
    //     }
    //     return cryptoWallet;
    // }

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