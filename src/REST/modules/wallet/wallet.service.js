const autoBind = require("auto-bind");
const bcrypt = require("bcrypt")
const BigNumber = require("bignumber.js")
const Wallet = require("./wallet.model")
const Transaction = require("../transactions/transactions.model");
const { sequelize } = require("../../../../config/sequelize");
const AuditLog = require("../transactions/auditLog.schema");
const { default: axios } = require("axios");
const saltRounds = process.env.SALT_ROUNDS || 12;
const {logger} = require("../../../common/utils");
const marketService = require("../market/market.service");
const defaultExchangeRates = {
    USD: { EUR: 0.85, BTC: 0.000022, ETH: 0.00032 },
    EUR: { USD: 1.18, BTC: 0.000025, ETH: 0.00038 },
    BTC: { USD: 45000, EUR: 38000, ETH: 14.5 },
    ETH: { USD: 3100, EUR: 2600, BTC: 0.068 }
};

const fiatCurrencies = ['USD', 'EUR', 'GBP']; // List of fiat currencies
const cryptoPrecision = 8;
const fiatPrecision = 2;

class WalletService {
    #model
    #transaction_model;
    #auditLog_model;

    constructor(){
        autoBind(this)
        this.#model = Wallet
        this.#transaction_model = Transaction
        this.#auditLog_model = AuditLog
        this.defaultFees = {
            deposit: 0.01,
            withdrawal: 0.015
        }
    }

    async logAuditAction(userId, action, transaction = null){
        const auditLog = await this.#auditLog_model.create({
            action,
            userId
        }, {transaction})
        return auditLog
    }


    async createWallet(userId, walletName, password){
        return sequelize.transaction(async (t) => {
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            
            const wallet = await this.#model.create({
                userId,
                walletName,
                password: hashedPassword,
                balances: {}
            }, { transaction: t });

            await this.logAuditAction(userId, `Created wallet`, t);
            logger.info(`Created wallet for user ${userId}`);
            return wallet;
        })
    }

    async getWalletByUserId(userId){
        const wallets = await this.#model.findAll({
            where: { userId },
            attributes: ['id', 'walletName', 'balances', 'createdAt', 'updatedAt'],
            // limit: limit || 10,  // Default limit set to 10
            // offset: offset || 0  // Default offset set to 0
        });
        
        if (!wallets.length) throw new Error('No wallets found for this user');
        return wallets;
    }

    async deleteWallet(userId, walletId){
        return this.retryTransaction(async () => {
            return sequelize.transaction(async (t) => {
                const wallet = await this.#findWallet(walletId, userId, t);

                const hasBalance = Object.values(wallet.balances).some(balance => new BigNumber(balance).gt(0));
                if (hasBalance) throw new Error('Cannot delete a wallet with a remaining balance.');

                await this.#model.destroy({ where: { id: walletId }, transaction: t });
                await this.logAuditAction(userId, `Deleted wallet ${walletId}`, t);
                logger.info(`Deleted wallet ${walletId} for user ${userId}`);
                return { message: `Wallet ${walletId} deleted successfully.` };
            });
        });
    }

    async lockWallet(walletId, userId){
        return sequelize.transaction(async (t) => {
            const wallet = await this.#findWallet(walletId,userId, t);
            wallet.isLocked = true;
            await wallet.save({ transaction: t });
            await this.logAuditAction(wallet.userId, `Locked wallet ${walletId}`, t);
            logger.info(`Locked wallet ${walletId}`);
            return wallet;
        });
    }

    async unlockWallet(walletId, userId){
        return sequelize.transaction(async (t) => {
            const wallet = await this.#findWallet(walletId, userId ,t);
            wallet.isLocked = false;
            await wallet.save({ transaction: t });
            await this.logAuditAction(wallet.userId, `Unlocked wallet ${walletId}`, t);
            logger.info(`Unlocked wallet ${walletId}`);
            return wallet;
        });
    }

    async depositFunds(userId, walletId, currency, amount, preferredCurrency = null) {
        this.#validateCurrency(currency)
        const amountBig = this.#validateAmount(amount);

        return this.retryTransaction(async () => {
            return sequelize.transaction(async (t) => {
                const wallet = await this.#findWallet(walletId, userId, t);
                // this.#validateCurrencyMatch(wallet, currency);

                let depositAmount = amountBig;
                if (preferredCurrency && preferredCurrency !== currency) {
                    depositAmount = await this.#convertCurrency(depositAmount, currency, preferredCurrency);
                    currency = preferredCurrency;
                }

                this.#updateBalance(wallet, currency, depositAmount);
                await wallet.save({ transaction: t });

                await this.#transaction_model.create({
                    userId,
                    walletId,
                    type: 'deposit',
                    currency,
                    amount: depositAmount.toFixed(8),
                    fee: '0.00',
                    status: 'completed'
                }, { transaction: t });

                await this.logAuditAction(userId, `Deposited ${depositAmount} ${currency} to wallet`, t);
                logger.info(`Deposited ${depositAmount} ${currency} to wallet for user ${userId}`);
                return wallet;
            })
        })
    }
    

    async withdrawFunds(walletId, userId, currency, requestedAmount, preferredCurrency = null) {
        this.#validateCurrency(currency);
        let amountBig = this.#validateAmount(requestedAmount);
        
        return this.retryTransaction(async () => {
            return sequelize.transaction(async (t) => {
                const wallet = await this.#findWallet(walletId, userId, t);
                const currentBalance = new BigNumber(wallet.balances[currency] || 0);
                
                // Check if the wallet is locked
                if (wallet.isLocked) throw new Error("Wallet is locked. Please unlock it to perform transactions.");
    
                const today = new Date().toISOString().slice(0, 10);
                
                // Reset daily limit if it's a new day
                if (wallet.lastWithdrawalDate !== today) {
                    wallet.withdrawnToday = new BigNumber(0);
                }
    
                const newWithdrawnToday = wallet.withdrawnToday.plus(amountBig);
                
                // Check daily withdrawal limit
                if (newWithdrawnToday.gt(wallet.dailyLimit)) {
                    throw new Error(`Daily withdrawal limit exceeded. You can withdraw up to ${wallet.dailyLimit.minus(wallet.withdrawnToday).toFixed(2)} ${currency} more today.`);
                }
                
    
                // Calculate the fee based on the requested withdrawal amount
                const fee = this.#calculateFee(amountBig, this.defaultFees.withdrawal);
                const totalCost = amountBig.plus(fee);
               
                // If the user is trying to withdraw their full balance
                if (amountBig.eq(currentBalance)) {
                    const feeForFullBalance = this.#calculateFee(currentBalance, this.defaultFees.withdrawal);

                    if (currentBalance.lte(feeForFullBalance)) {
                        throw new Error(`Insufficient balance to cover the withdrawal fee. Your balance is ${currentBalance.toFixed(2)} ${currency}, and the fee is ${feeForFullBalance.toFixed(2)} ${currency}.`);
                    }
                    const withdrawableAmount = currentBalance.minus(feeForFullBalance);
                    
                    // Update balance to zero
                    this.#updateBalance(wallet, currency, currentBalance.negated());

                    wallet.withdrawnToday = newWithdrawnToday.toFixed(2);
                    wallet.lastWithdrawalDate = today;
    
                    await wallet.save({ transaction: t });
    
                    // Log the transaction for full balance withdrawal
                    await this.#transaction_model.create({
                        userId,
                        walletId,
                        type: 'withdrawal',
                        currency,
                        amount: withdrawableAmount.toFixed(2), // Actual amount after fee
                        fee: feeForFullBalance.toFixed(2),
                        status: 'completed'
                    }, { transaction: t });
    
                    await this.logAuditAction(userId, `Withdrew ${withdrawableAmount.toFixed(2)} ${currency} from wallet (Fee: ${feeForFullBalance.toFixed(2)} ${currency})`, t);
                    
                    logger.info(`Withdrew ${withdrawableAmount.toFixed(2)} ${currency} from wallet for user ${userId} (Fee: ${feeForFullBalance.toFixed(2)} ${currency})`);
    
                    // Return the details
                    return {
                        message: "Funds withdrawn successfully",
                        wallet: {
                            wallet,
                            withdrawalAmount: withdrawableAmount.toFixed(2), // Actual withdrawal amount after fee deduction
                            fee: feeForFullBalance.toFixed(2),
                            remainingBalance: "0.00" // Remaining balance after full withdrawal
                        }
                    };
                }
    
    
                // Update wallet balance after withdrawal
                this.#updateBalance(wallet, currency, totalCost.negated());
    
                // Update daily withdrawal limits and last withdrawal date
                wallet.withdrawnToday = newWithdrawnToday.toFixed(2);
                wallet.lastWithdrawalDate = today;

    
                await wallet.save({ transaction: t });
    
                // Log the transaction for partial withdrawal
                const actualWithdrawAmount = amountBig.minus(fee); // The amount user receives after fee
                await this.#transaction_model.create({
                    userId,
                    walletId,
                    type: 'withdrawal',
                    currency,
                    amount: actualWithdrawAmount.toFixed(2), // Amount after fee subtraction
                    fee: fee.toFixed(2),
                    status: 'completed'
                }, { transaction: t });
    
                await this.logAuditAction(userId, `Withdrew ${actualWithdrawAmount.toFixed(2)} ${currency} from wallet (Fee: ${fee.toFixed(2)} ${currency})`, t);
                logger.info(`Withdrew ${amountBig.toFixed(2)} ${currency} from wallet for user ${userId} (Fee: ${fee.toFixed(2)} ${currency})`);
                // Return the details for partial withdrawal
                return {
                    message: "Funds withdrawn successfully",
                    wallet: {
                        wallet,
                        withdrawalAmount: actualWithdrawAmount.toFixed(2), // Amount after fee subtraction
                        fee: fee.toFixed(2),
                        remainingBalance: currentBalance.minus(totalCost).toFixed(2) // Remaining balance after withdrawal and fee deduction
                    }
                };
            });
        });
    }
    
    
    async transferFunds(senderWalletId, recipientWalletId, amount, password) {
        const amountBig = this.#validateAmount(amount);
    
        return this.retryTransaction(async () => {
            return sequelize.transaction(async (t) => {
                const senderWallet = await Wallet.findOne({ where: { id: senderWalletId }, transaction: t });
                if (!senderWallet) throw new Error(`Sender wallet with ID ${senderWalletId} not found.`);

                // Find the recipient's wallet directly within the transaction block
                const recipientWallet = await Wallet.findOne({ where: { id: recipientWalletId }, transaction: t });
                if (!recipientWallet) throw new Error(`Recipient wallet with ID ${recipientWalletId} not found.`)
    
                if (senderWallet.isLocked || recipientWallet.isLocked) {
                    throw new Error('One of the wallets is locked');
                }
    
                await this.#validateWalletPassword(senderWallet, password);
    
                let transferAmount = amountBig;
                let fee = this.#calculateFee(amountBig, this.defaultFees.withdrawal);
                let finalTransferAmount = transferAmount.minus(fee);
    
                if (finalTransferAmount.lte(0)) {
                    throw new Error('Transfer amount must be greater than the fee.');
                }
    
                this.#checkSufficientBalance(senderWallet, senderWallet.currency, transferAmount);
    
                if (senderWallet.currency !== recipientWallet.currency) {
                    const rate = await this.getExchangeRate(senderWallet.currency, recipientWallet.currency);
                    finalTransferAmount = finalTransferAmount.multipliedBy(rate);
    
                    // Log the conversion within the transaction context
                    await this.#transaction_model.create({
                        walletId: senderWallet.id,
                        userId: senderWallet.userId,
                        type: 'transfer',
                        amount: amountBig.toFixed(8),
                        currency: senderWallet.currency,
                        convertedAmount: finalTransferAmount.toFixed(8),
                        convertedCurrency: recipientWallet.currency,
                        fee: fee.toFixed(8),
                        status: 'completed'
                    }, { transaction: t });
                }
    
                // Deduct the amount from the sender's wallet
                this.#updateBalance(senderWallet, senderWallet.currency, transferAmount.negated());
                await senderWallet.save({ transaction: t });
    
                // Add the amount to the recipient's wallet
                this.#updateBalance(recipientWallet, recipientWallet.currency, finalTransferAmount);
                await recipientWallet.save({ transaction: t });
    
                // Log the transfer within the transaction context
                await this.#logTransfer(senderWallet, recipientWallet, finalTransferAmount, t);
    
                return {
                    message: 'Transfer completed successfully',
                    senderWallet: {
                        id: senderWallet.id,
                        currency: senderWallet.currency,
                        balance: senderWallet.balances[senderWallet.currency],
                        fee: fee.toFixed(8)
                    },
                    recipientWallet: {
                        id: recipientWallet.id,
                        currency: recipientWallet.currency,
                        balance: recipientWallet.balances[recipientWallet.currency],
                        receivedAmount: finalTransferAmount.toFixed(8)
                    }
                };
            });
        });
    }
    
    

    async getTransactionHistory(walletId){
        const transactions = await this.#transaction_model.findAll({
            where: { walletId },
            order: [['createdAt', 'DESC']]
        });

        if (!transactions.length) throw new Error('No transactions found for this wallet');
        logger.info(`Fetched transaction history for wallet ${walletId}`);
        return transactions;
    }


    async checkBalance(walletId){
        const wallet = await this.#model.findByPk(walletId);
        if (!wallet) throw new Error('Wallet not found');

        logger.info(`Checked balance for wallet ${walletId}`);
        return { balance: wallet.balances };
    }

    async convertFunds(userId,walletId, fromCurrency, toCurrency, amount){
        const amountBig = new BigNumber(amount)
        const rate = await this.getExchangeRate(fromCurrency, toCurrency);

        if(!rate || rate <= 0){
            throw new Error(`Invalid exchange rate from ${fromCurrency} to ${toCurrency}`)
        }
        
        
        return sequelize.transaction(async (t) => {
            const wallet = await this.#findWallet(walletId, userId, t);
            this.#checkSufficientBalance(wallet, fromCurrency, amountBig)
            
            const fee = this.#calculateFee(amountBig, this.defaultFees.withdrawal)
            const finalAmount = amountBig.minus(fee)
            const convertedAmount = finalAmount.multipliedBy(rate);

            this.#updateBalance(wallet, fromCurrency, amountBig.negated());
            this.#updateBalance(wallet, toCurrency, new BigNumber(convertedAmount));

            await wallet.save({ transaction: t });

            await this.#transaction_model.create({
                walletId: wallet.id,
                userId: wallet.userId,
                type: 'conversion',
                amount: amountBig.toFixed(),
                currency: fromCurrency,
                convertedAmount: convertedAmount,
                convertedCurrency: toCurrency,
                status: 'completed'
            }, { transaction: t });

            await this.logAuditAction(wallet.userId, `Converted ${amountBig} ${fromCurrency} to ${convertedAmount} ${toCurrency}`, t);
            return wallet;
        })
    }

    async getExchangeRate(fromCurrency, toCurrency){
        try {
            const response = await axios.get("https://api.coingecko.com/api/v3/exchange_rates", {
                headers: { accept: 'application/json' }
            });

            const apiRates = response.data.rates;
            const fromRate = apiRates[fromCurrency.toLowerCase()];
            const toRate = apiRates[toCurrency.toLowerCase()];

            if (fromRate && toRate) {
                const rate = toRate.value / fromRate.value;
                logger.info(`Using API rate for ${fromCurrency} to ${toCurrency}: ${rate}`);
                return rate;
            }

            logger.info(`Falling back to default rates for ${fromCurrency} to ${toCurrency}`);
            return this.#getDefaultExchangeRate(fromCurrency, toCurrency);
        } catch (error) {
            logger.error(`Failed to fetch exchange rate: ${error.message}`);
            return this.#getDefaultExchangeRate(fromCurrency, toCurrency);
        }
    }
    
    async getSupportedCurrencies(){
        const supportedCurrencies = await marketService.getSupportedCurrencies()
        return supportedCurrencies
    }
    #validateCurrency(currency) {
        if (!fiatCurrencies.includes(currency.toUpperCase())) {
            throw new Error(`Currency ${currency} is not supported. Please choose from ${fiatCurrencies.join(', ')}`);
        }
    }

    async retryTransaction(cb, retries = 3, delay = 1000){
        for (let i = 0; i < retries; i++) {
            try {
                return await cb();
            } catch (error) {
                if (i < retries - 1) {
                    logger.warn(`Retrying transaction due to error: ${error.message}`);
                }
                if (i === retries - 1 || !this.isTransientError(error)) throw error;
                await new Promise(res => setTimeout(res, delay)); // Wait before retrying
            }
        }
    }

    isTransientError(error) {
        return error.message.includes('deadlock') || 
        error.code === 'ER_LOCK_DEADLOCK' || 
        error.message.includes('lock wait timeout');
    }

    async #validateWalletNotExists(userId, currency, transaction) {
        const existingWallet = await this.#model.findOne({
            where: { userId, currency },
            transaction
        });
        if (existingWallet) throw new Error(`Wallet with currency ${currency} already exists for this user.`);
    }

    #validateAmount(amount) {
        const amountBig = new BigNumber(amount);
        if (amountBig.isNaN() || amountBig.lte(0)) throw new Error('Invalid amount');
        return amountBig;
    }

    // #validateCurrencyMatch(wallet, currency) {
    //     if (wallet.currency !== currency.toUpperCase()) {
    //         throw new Error(`This wallet only accepts deposits in ${wallet.currency}.`);
    //     }
    // }

    #calculateFee(amount, feePercentage){
        return new BigNumber(amount).multipliedBy(feePercentage);
    }

    #updateBalance(wallet, currency, amount) {
        const currentBalance = new BigNumber(wallet.balances[currency] || 0);
        const newBalance = currentBalance.plus(amount);
        const precision = fiatCurrencies.includes(currency.toUpperCase()) ? fiatPrecision : cryptoPrecision;
        wallet.balances[currency] = newBalance.toFixed(precision);
        wallet.changed('balances', true);
        logger.info(`Updated balance for ${currency}: ${newBalance}`);
    }

    #checkSufficientBalance(wallet, currency, amount) {
        const balance = new BigNumber(wallet.balances[currency] || 0);
        if (balance.lt(amount)) {
            throw new Error(`Insufficient balance. You have ${balance.toFixed(2)} ${currency} but tried to process ${amount.toFixed(2)} ${currency}.`);
        }
    }

   async #convertCurrency(amount, fromCurrency, toCurrency){
        const rate = await this.getExchangeRate(fromCurrency, toCurrency);
        if (!rate) throw new Error(`Exchange rate for ${fromCurrency} to ${toCurrency} is not available.`);
        return amount.multipliedBy(rate);
    }

    async #validateWalletPassword(wallet, password){
        const isPasswordValid = await bcrypt.compare(password, wallet.password)
        if( !isPasswordValid){
            throw new Error('Invalid wallet password')
        }
    }

    async #findWallet(walletId, userId, transaction){
        const wallet = await this.#model.findOne({ where: { id: walletId, userId }, transaction: transaction });
        if (!wallet) throw new Error(`Wallet with ID ${walletId} not found for user ${userId}.`);
        return wallet;
    }

    async #logTransfer(senderWallet, recipientWallet, amount, transaction){
        await this.#transaction_model.create({
            walletId: senderWallet.id,
            userId: senderWallet.userId,
            type: 'transfer',
            amount: amount.toFixed(8),
            status: 'completed'
        }, {transaction})

        await this.#transaction_model.create({
            walletId: recipientWallet.id,
            userId: recipientWallet.userId,
            type: 'transfer',
            amount: amount.toFixed(8),
            status: 'completed'
        }, {transaction})
        await this.logAuditAction(senderWallet.userId, `Transferred ${amount.toFixed(8)} from wallet ${senderWallet.id} to wallet ${recipientWallet.id}`, transaction)
    }

    // #isCurrencySupported(currency){
    //     return Object.keys(defaultExchangeRates).includes(currency.toUpperCase())
    // }

    #isFiatCurrency(currency){
        const fiatCurrencies = ['USD', 'EUR', 'GBP']
        return fiatCurrencies.includes(currency.toUpperCase())
    }

    #getDefaultExchangeRate(fromCurrency, toCurrency){
        const defaultRates = defaultExchangeRates[fromCurrency.toUpperCase()];
        if (!defaultRates || !defaultRates[toCurrency.toUpperCase()]) throw new Error(`Conversion from ${fromCurrency} to ${toCurrency} is not supported.`);
        return defaultRates[toCurrency.toUpperCase()];
    }
    

}
module.exports = new WalletService()