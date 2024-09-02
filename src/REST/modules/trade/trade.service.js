const autoBind = require("auto-bind");
const { default: BigNumber } = require("bignumber.js");
const { sequelize } = require("../../../../config/sequelize");
const walletService = require("../wallet/wallet.service");
const TradeSchema = require("./trade.model");
const WalletSchema = require("../wallet/wallet.model");
const AuditLog = require("../transactions/auditLog.schema");
const { Op } = require("sequelize");
const TransactionSchema = require("../transactions/transactions.model");
const { default: axios } = require("axios");
const { logger } = require("../../../common/utils");
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

    async getCoinPrice(crypto, currency) {   
        const lowerCaseCurrency = currency.toLowerCase();
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${crypto}&vs_currencies=${lowerCaseCurrency}`;
        try {
            const response = await axios.get(url, {
                headers: {
                    accept: 'application/json',
                    'x-cg-demo-api-key': ' CG-A8496fii4gtpiNk6DEebo3ok '
                }
            });
            return response.data[crypto][lowerCaseCurrency];
        } catch (error) {
            logger.error(`Error fetching coin price for ${crypto} in ${lowerCaseCurrency}: ${error.message}`);
            throw new Error('Error fetching coin price');
        }
    }


    async buyOrder(userId, walletId, crypto, amount, currency) {
        return sequelize.transaction(async (t) => {
            if (!crypto || !currency) {
                throw new Error("Invalid parameters: crypto and currency are required.");
            }
    
            const standardizedCurrency = currency.toUpperCase();
            const cryptoKey = crypto.toLowerCase();
    
            // Step 1: Find or create the wallet
            let wallet = walletId 
                ? await this.#wallet_model.findOne({ where: { id: walletId, userId }, transaction: t })
                : await this.findOrCreateWallet(userId, standardizedCurrency, t);
    
            if (!wallet) throw new Error(`Wallet with ID ${walletId} not found for user ${userId}.`);
    
            // Step 2: Validate the amount
            const validAmount = new BigNumber(amount);
            if (validAmount.isNaN() || validAmount.lte(0)) {
                throw new Error("Invalid amount provided. Please provide a valid number greater than zero.");
            }
    
            // Step 3: Fetch the price of the crypto
            logger.info(`Fetching price for ${cryptoKey} in ${standardizedCurrency}`);
            const rate = await this.getCoinPrice(cryptoKey, standardizedCurrency.toLowerCase());
            if (!rate || isNaN(rate)) {
                throw new Error("Invalid rate received. Please check the currency or crypto.");
            }
    
            // Step 4: Calculate the total cost
            const totalCost = validAmount.multipliedBy(rate);
            if (totalCost.isNaN()) {
                throw new Error("Invalid cost calculation. Please check the amount and rate.");
            }
    
            // Step 5: Check if the wallet has sufficient balance in the specified currency
            this.#checkSufficientBalance(wallet, standardizedCurrency, totalCost);
    
            // Step 6: Update the fiat currency balance
            const currentFiatBalance = new BigNumber(wallet.balances[standardizedCurrency] || '0');
            const updatedFiatBalance = currentFiatBalance.minus(totalCost).toFixed(fiatPrecision);
            wallet.balances[standardizedCurrency] = updatedFiatBalance;
            logger.info(`Updated fiat balance (${standardizedCurrency}): ${updatedFiatBalance}`);
    
            // Step 7: Update the crypto balance
            const currentCryptoBalance = new BigNumber(wallet.balances[cryptoKey] || '0');
            const updatedCryptoBalance = currentCryptoBalance.plus(validAmount).toFixed(cryptoPrecision);
            wallet.balances[cryptoKey] = updatedCryptoBalance;
            logger.info(`Updated crypto balance (${cryptoKey}): ${updatedCryptoBalance}`);
    
            // Ensure the balances are marked as changed
            wallet.changed('balances', true);
    
            // Step 8: Save the wallet with updated balances
            await wallet.save({ transaction: t });
            logger.info(`Wallet saved. Balance (${standardizedCurrency}): ${wallet.balances[standardizedCurrency]}`);
    
            // Reload the wallet to ensure the data was persisted correctly
            const refreshedWallet = await this.#wallet_model.findOne({ where: { id: wallet.id }, transaction: t, lock: true });
            logger.info(`Wallet reloaded. Balance (${standardizedCurrency}): ${refreshedWallet.balances[standardizedCurrency]}`);
            logger.info(`Wallet reloaded. Balance (${cryptoKey}): ${refreshedWallet.balances[cryptoKey]}`);
    
            // Step 9: Validate the saved balances
            if (refreshedWallet.balances[standardizedCurrency] !== updatedFiatBalance ||
                refreshedWallet.balances[cryptoKey] !== updatedCryptoBalance) {
                throw new Error("Balance mismatch detected after saving wallet. Please try again.");
            }
    
            // Step 10: Log the transaction
            await this.#transaction_model.create({
                userId,
                walletId: wallet.id,
                type: 'buy',
                currency: standardizedCurrency,
                amount: totalCost.toFixed(fiatPrecision),
                crypto: cryptoKey,
                cryptoAmount: validAmount.toFixed(cryptoPrecision),
                status: 'completed'
            }, { transaction: t });
    
            return { wallet: refreshedWallet };
        }).catch(error => {
            logger.error(`Transaction failed: ${error.message}`);
            throw error;
        });
    }
    
    
    
    async sellOrder(userId, walletId, crypto, amount, currency) {
        return sequelize.transaction(async (t) => {
            if (!crypto || !currency) {
                throw new Error("Invalid parameters: crypto and currency are required.");
            }
    
            const standardizedCurrency = currency.toUpperCase();
            const cryptoKey = crypto.toLowerCase();
    
            // Step 1: Find or create the wallet and lock it for the transaction
            let wallet = walletId 
                ? await this.#wallet_model.findOne({ where: { id: walletId, userId }, transaction: t, lock: true })
                : await this.findOrCreateWallet(userId, standardizedCurrency, t);
    
            if (!wallet) throw new Error(`Wallet with ID ${walletId} not found for user ${userId}.`);
    
            // Step 2: Validate the amount
            const validAmount = new BigNumber(amount);
            if (validAmount.isNaN() || validAmount.lte(0)) {
                throw new Error("Invalid amount provided. Please provide a valid number greater than zero.");
            }
    
            // Step 3: Check if the wallet has sufficient balance of the cryptocurrency
            this.#checkSufficientBalance(wallet, cryptoKey, validAmount);
    
            // Step 4: Fetch the price of the crypto
            logger.info(`Fetching price for ${cryptoKey} in ${standardizedCurrency}`);
            const rate = await this.getCoinPrice(cryptoKey, standardizedCurrency.toLowerCase());
            if (!rate || isNaN(rate)) {
                throw new Error("Invalid rate received. Please check the currency or crypto.");
            }
    
            // Step 5: Calculate the total value in the specified currency
            const totalValue = validAmount.multipliedBy(rate);
            if (totalValue.isNaN()) {
                throw new Error("Invalid value calculation. Please check the amount and rate.");
            }
    
            // Step 6: Update the crypto balance (deduct the amount)
            const currentCryptoBalance = new BigNumber(wallet.balances[cryptoKey] || '0');
            const updatedCryptoBalance = currentCryptoBalance.minus(validAmount).toFixed(cryptoPrecision);
            wallet.balances[cryptoKey] = updatedCryptoBalance;
            logger.info(`Updated crypto balance (${cryptoKey}): ${updatedCryptoBalance}`);
    
            // Step 7: Update the fiat currency balance (add the value)
            const currentFiatBalance = new BigNumber(wallet.balances[standardizedCurrency] || '0');
            const updatedFiatBalance = currentFiatBalance.plus(totalValue).toFixed(fiatPrecision);
            wallet.balances[standardizedCurrency] = updatedFiatBalance;
            logger.info(`Updated fiat balance (${standardizedCurrency}): ${updatedFiatBalance}`);
    
            // Ensure the balances are marked as changed
            wallet.changed('balances', true);
    
            // Step 8: Save the wallet with updated balances and await full completion
            await wallet.save({ transaction: t });
            logger.info(`Wallet saved. Balance (${standardizedCurrency}): ${wallet.balances[standardizedCurrency]}`);
    
            // Reload the wallet to ensure the data was persisted correctly
            const refreshedWallet = await this.#wallet_model.findOne({ where: { id: wallet.id }, transaction: t, lock: true });
            logger.info(`Wallet reloaded. Balance (${standardizedCurrency}): ${refreshedWallet.balances[standardizedCurrency]}`);
            logger.info(`Wallet reloaded. Balance (${cryptoKey}): ${refreshedWallet.balances[cryptoKey]}`);
    
            // Step 9: Validate the saved balances
            if (refreshedWallet.balances[standardizedCurrency] !== updatedFiatBalance ||
                refreshedWallet.balances[cryptoKey] !== updatedCryptoBalance) {
                throw new Error("Balance mismatch detected after saving wallet. Please try again.");
            }
    
            // Step 10: Log the transaction
            await this.#transaction_model.create({
                userId,
                walletId: wallet.id,
                type: 'sell',
                currency: standardizedCurrency,
                amount: totalValue.toFixed(fiatPrecision),
                crypto: cryptoKey,
                cryptoAmount: validAmount.toFixed(cryptoPrecision),
                status: 'completed'
            }, { transaction: t });
    
            return { wallet: refreshedWallet };
        }).catch(error => {
            logger.error(`Transaction failed: ${error.message}`);
            throw error;
        });
    }
    

    

    async getDefaultWallet(userId, currency){
        const wallet = await this.#wallet_model.findOne({where: { userId, balances: { [currency]: {[Op.gt]: 0} }}})
        if(!wallet) throw new Error('No wallet found with sufficient balance for this currency')
        return wallet
    }

    async findOrCreateWallet(userId, currency, transaction){
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