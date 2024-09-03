const autoBind = require("auto-bind");
const bcrypt = require("bcrypt");
const BigNumber = require("bignumber.js");
const Wallet = require("./wallet.model");
const Transaction = require("../transactions/transactions.model");
const { sequelize } = require("../../../../config/sequelize");
const AuditLog = require("../transactions/auditLog.schema");
const { default: axios } = require("axios");
const saltRounds = process.env.SALT_ROUNDS || 12;
const logger  = require("../../../common/utils");
const marketService = require("../market/market.service");
const Sequelize = require("sequelize");

const defaultExchangeRates = {
    USD: { EUR: 0.85, BTC: 0.000022, ETH: 0.00032 },
    EUR: { USD: 1.18, BTC: 0.000025, ETH: 0.00038 },
    BTC: { USD: 45000, EUR: 38000, ETH: 14.5 },
    ETH: { USD: 3100, EUR: 2600, BTC: 0.068 }
};

const fiatCurrencies = ['usd', 'eur', 'gbp']; // List of fiat currencies
const cryptoPrecision = 8;
const fiatPrecision = 2;
const exchangeRateCache = {};

class WalletError extends Error {
    constructor(message, code = 400) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}

class WalletService {
    #model;
    #transaction_model;
    #auditLog_model;

    constructor() {
        autoBind(this);
        this.#model = Wallet;
        this.#transaction_model = Transaction;
        this.#auditLog_model = AuditLog;
        this.defaultFees = {
            deposit: 0.01,
            withdrawal: 0.015
        };
    }

    async logAuditAction(userId, action, transaction = null) {
        const auditLog = await this.#auditLog_model.create({
            action,
            userId
        }, { transaction });
        return auditLog;
    }

    async createWallet(userId, walletName, password) {
        return sequelize.transaction({
            isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ
        }, async (t) => {
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
        });
    }

    async getWalletByUserId(userId) {
        const wallets = await this.#model.findAll({
            where: { userId },
            attributes: ['id', 'walletName', 'balances', 'createdAt', 'updatedAt']
        });

        if (!wallets.length) throw new WalletError('No wallets found for this user', 404);
        return wallets;
    }

    async deleteWallet(userId, walletId) {
        return this.retryTransaction(async () => {
            return sequelize.transaction({
                isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ
            }, async (t) => {
                const wallet = await this.#findWallet(walletId, userId, t);

                const hasBalance = Object.values(wallet.balances).some(balance => new BigNumber(balance).gt(0));
                if (hasBalance) throw new WalletError('Cannot delete a wallet with a remaining balance.', 400);

                await this.#model.destroy({ where: { id: walletId }, transaction: t });
                await this.logAuditAction(userId, `Deleted wallet ${walletId}`, t);
                logger.info(`Deleted wallet ${walletId} for user ${userId}`);
                return { message: `Wallet ${walletId} deleted successfully.` };
            });
        });
    }

    async lockWallet(walletId, userId) {
        return sequelize.transaction({
            isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ
        }, async (t) => {
            const wallet = await this.#findWallet(walletId, userId, t);
            wallet.isLocked = true;
            await wallet.save({ transaction: t });
            await this.logAuditAction(wallet.userId, `Locked wallet ${walletId}`, t);
            logger.info(`Locked wallet ${walletId}`);
            return wallet;
        });
    }

    async unlockWallet(walletId, userId) {
        return sequelize.transaction({
            isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ
        }, async (t) => {
            const wallet = await this.#findWallet(walletId, userId, t);
            wallet.isLocked = false;
            await wallet.save({ transaction: t });
            await this.logAuditAction(wallet.userId, `Unlocked wallet ${walletId}`, t);
            logger.info(`Unlocked wallet ${walletId}`);
            return wallet;
        });
    }

    async depositFunds(userId, walletId, currency, amount, preferredCurrency = null) {
        await this.#validateCurrency(currency);
        const amountBig = this.#validateAmount(amount);

        return this.retryTransaction(async () => {
            return sequelize.transaction({
                isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ
            }, async (t) => {
                const wallet = await this.#findWallet(walletId, userId, t);

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
                    amount: depositAmount.toFixed(cryptoPrecision),
                    fee: '0.00',
                    status: 'completed'
                }, { transaction: t });

                await this.logAuditAction(userId, `Deposited ${depositAmount.toFixed(cryptoPrecision)} ${currency} to wallet`, t);
                console.log(`Debugging depositFunds: depositAmount=${depositAmount.toFixed(cryptoPrecision)}, currency=${currency}, userId=${userId}`);
                logger.info(`Deposited ${depositAmount.toFixed(cryptoPrecision)} ${currency} to wallet for user ${userId}`);
                return wallet;
            });
        });
    }

    async withdrawFunds(walletId, userId, currency, requestedAmount, preferredCurrency = null) {
        await this.#validateCurrency(currency);
        let amountBig = this.#validateAmount(requestedAmount);

        return this.retryTransaction(async () => {
            return sequelize.transaction({
                isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ
            }, async (t) => {
                const wallet = await this.#findWallet(walletId, userId, t);
                const currentBalance = new BigNumber(wallet.balances[currency] || 0);

                if (wallet.isLocked) throw new WalletError("Wallet is locked. Please unlock it to perform transactions.", 403);

                this.#checkDailyLimit(wallet, amountBig, currency);
                this.#checkSufficientBalance(wallet, currency, amountBig);

                const fee = this.#calculateFee(amountBig, this.defaultFees.withdrawal);
                const totalCost = amountBig.plus(fee);

                if (amountBig.eq(currentBalance)) {
                    return this.#withdrawFullBalance(wallet, currency, currentBalance, fee, t);
                }

                if (totalCost.gt(currentBalance)) {
                    throw new WalletError(`Insufficient balance. Your balance is ${currentBalance.toFixed(2)} ${currency} but tried to withdraw ${amountBig.toFixed(2)} ${currency} plus a fee of ${fee.toFixed(2)} ${currency}.`, 400);
                }

                this.#processWithdrawal(wallet, currency, totalCost, fee, t);

                await wallet.save({ transaction: t });

                return this.#logWithdrawal(wallet, userId, walletId, currency, amountBig, fee, t);
            });
        });
    }

    async transferFunds(senderWalletId, recipientWalletId, amount, currency, password) {
        const amountBig = this.#validateAmount(amount);

        return this.retryTransaction(async () => {
            return sequelize.transaction({
                isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ
            }, async (t) => {
                const senderWallet = await this.#findWallet(senderWalletId, null, t);
                const recipientWallet = await this.#findWallet(recipientWalletId, null, t);

                if (!senderWallet || !recipientWallet) throw new WalletError('One of the wallets was not found.', 404);
                if (senderWallet.isLocked || recipientWallet.isLocked) throw new WalletError('One of the wallets is locked.', 403);

                if (!senderWallet.balances.hasOwnProperty(currency)) {
                    throw new WalletError(`Currency ${currency} is not available in the sender's wallet.`, 400);
                }

                await this.#validateWalletPassword(senderWallet, password);

                let fee = this.#calculateFee(amountBig, this.defaultFees.withdrawal);
                let finalTransferAmount = amountBig.plus(fee);

                if (finalTransferAmount.lte(0)) {
                    throw new WalletError('Transfer amount must be greater than the fee.', 400);
                }

                this.#checkSufficientBalance(senderWallet, currency, finalTransferAmount);

                this.#updateBalance(senderWallet, currency, finalTransferAmount.negated());
                await senderWallet.save({ transaction: t });

                if (!recipientWallet.balances[currency]) {
                    recipientWallet.balances[currency] = '0.00';
                }

                this.#updateBalance(recipientWallet, currency, amountBig);
                await recipientWallet.save({ transaction: t });

                await this.#logTransfer(senderWallet, recipientWallet, amountBig, fee, currency, t);

                return {
                    message: 'Transfer completed successfully',
                    senderWallet: {
                        id: senderWallet.id,
                        currency,
                        balance: senderWallet.balances[currency],
                        fee: fee.toFixed(cryptoPrecision)
                    },
                    recipientWallet: {
                        id: recipientWallet.id,
                        currency,
                        balance: recipientWallet.balances[currency],
                        receivedAmount: amountBig.toFixed(cryptoPrecision)
                    }
                };
            });
        });
    }

    async convertFunds(userId, walletId, fromCurrency, toCurrency, amount) {
        const amountBig = this.#validateAmount(amount);
        const rate = await this.getExchangeRate(fromCurrency, toCurrency);

        if (!rate || rate <= 0) {
            throw new WalletError(`Invalid exchange rate from ${fromCurrency} to ${toCurrency}`, 400);
        }

        return sequelize.transaction({
            isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ
        }, async (t) => {
            const wallet = await this.#findWallet(walletId, userId, t);
            this.#checkSufficientBalance(wallet, fromCurrency, amountBig);

            const fee = this.#calculateFee(amountBig, this.defaultFees.withdrawal);
            const finalAmount = amountBig.minus(fee);

            if (finalAmount.lte(0)) {
                throw new WalletError('Conversion amount must be greater than the fee.', 400);
            }

            const convertedAmount = finalAmount.multipliedBy(rate);
            const precision = fiatCurrencies.includes(toCurrency) ? fiatPrecision : cryptoPrecision;

            this.#updateBalance(wallet, fromCurrency, amountBig.negated());
            this.#updateBalance(wallet, toCurrency, new BigNumber(convertedAmount).toFixed(precision));

            await wallet.save({ transaction: t });

            await this.#transaction_model.create({
                walletId: wallet.id,
                userId: wallet.userId,
                type: 'transfer',
                amount: amountBig.toFixed(),
                currency: fromCurrency,
                convertedAmount: convertedAmount.toFixed(precision),
                convertedCurrency: toCurrency,
                status: 'completed'
            }, { transaction: t });

            await this.logAuditAction(wallet.userId, `Converted ${amountBig.toFixed()} ${fromCurrency} to ${convertedAmount.toFixed(precision)} ${toCurrency}`, t);

            return {
                wallet,
                conversionDetails: {
                    fromCurrency,
                    toCurrency,
                    originalAmount: amountBig.toFixed(),
                    convertedAmount: convertedAmount.toFixed(precision),
                    fee: fee.toFixed(),
                    finalAmount: finalAmount.toFixed(precision)
                }
            };
        });
    }

    async getExchangeRate(fromCurrency, toCurrency) {
        const cacheKey = `${fromCurrency}_${toCurrency}`;
        if (exchangeRateCache[cacheKey]) {
            logger.info(`Using cached exchange rate for ${fromCurrency} to ${toCurrency}`);
            return exchangeRateCache[cacheKey];
        }

        try {
            const response = await axios.get("https://api.coingecko.com/api/v3/exchange_rates", {
                headers: { accept: 'application/json' }
            });

            const apiRates = response.data.rates;
            const fromRate = apiRates[fromCurrency.toLowerCase()];
            const toRate = apiRates[toCurrency.toLowerCase()];

            if (fromRate && toRate) {
                const rate = toRate.value / fromRate.value;
                exchangeRateCache[cacheKey] = rate;
                setTimeout(() => delete exchangeRateCache[cacheKey], 3600000); // Cache expires in 1 hour
                logger.info(`Using API rate for ${fromCurrency} to ${toCurrency}: ${rate}`);
                return rate;
            }

            throw new Error("Invalid rates returned from API");
        } catch (error) {
            logger.error(`Failed to fetch exchange rate: ${error.message}. Falling back to default rates.`);
            return this.#getDefaultExchangeRate(fromCurrency, toCurrency);
        }
    }

    async getAvailableCurrenciesForUser(userId) {
        const wallets = await this.#model.findAll({
            where: { userId },
            attributes: ['balances', 'walletName']
        });

        if (!wallets.length) throw new WalletError('No wallets found for this user', 404);

        return wallets.map(wallet => ({
            walletId: wallet.id,
            walletName: wallet.walletName,
            availableCurrencies: Object.keys(wallet.balances || {}),
            balances: wallet.balances
        }));
    }

    async getTransactionHistory(walletId, limit = 10, offset = 0) {
        const transactions = await this.#transaction_model.findAll({
            where: { walletId },
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });

        if (!transactions.length) throw new WalletError('No transactions found for this wallet', 404);
        logger.info(`Fetched transaction history for wallet ${walletId}`);
        return transactions;
    }

    async checkBalance(walletId) {
        const wallet = await this.#model.findByPk(walletId);
        if (!wallet) throw new WalletError('Wallet not found', 404);

        logger.info(`Checked balance for wallet ${walletId}`);
        return { balance: wallet.balances };
    }

    async getSupportedCurrencies() {
        return await marketService.getSupportedCurrencies();
    }

    async retryTransaction(cb, retries = 3, delay = 1000) {
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
        return error.message.includes('deadlock') || error.code === 'ER_LOCK_DEADLOCK' || error.message.includes('lock wait timeout');
    }

    async #validateCurrency(currency) {
        const supportedCurrencies = await this.getSupportedCurrencies();
        if (!supportedCurrencies.includes(currency)) {
            throw new WalletError(`Currency ${currency} is not supported. Please choose from ${supportedCurrencies.join(', ')}`, 400);
        }
    }

    #validateAmount(amount) {
        const amountBig = new BigNumber(amount);
        if (amountBig.isNaN() || amountBig.lte(0)) throw new WalletError('Invalid amount', 400);
        return amountBig;
    }

    #calculateFee(amount, feePercentage) {
        return new BigNumber(amount).multipliedBy(feePercentage);
    }

    #updateBalance(wallet, currency, amount) {
        const currentBalance = new BigNumber(wallet.balances[currency] || 0);
        const newBalance = currentBalance.plus(amount);
        const precision = fiatCurrencies.includes(currency) ? fiatPrecision : cryptoPrecision;
        wallet.balances[currency] = newBalance.toFixed(precision);
        wallet.changed('balances', true);
        console.log(`Debugging #updateBalance: newBalance=${newBalance.toFixed(precision)}, currency=${currency}`);
        logger.info(`Updated balance for ${currency.toLowerCase()}: ${newBalance.toFixed(precision)}`);
    }

    #checkSufficientBalance(wallet, currency, amount) {
        const balance = new BigNumber(wallet.balances[currency] || 0);
        if (balance.lt(amount)) {
            throw new WalletError(`Insufficient balance. You have ${balance.toFixed(2)} ${currency} but tried to process ${amount.toFixed(2)} ${currency}.`, 400);
        }
    }

    async #convertCurrency(amount, fromCurrency, toCurrency) {
        const rate = await this.getExchangeRate(fromCurrency, toCurrency);
        if (!rate) throw new WalletError(`Exchange rate for ${fromCurrency} to ${toCurrency} is not available.`, 400);
        return amount.multipliedBy(rate);
    }

    async #validateWalletPassword(wallet, password) {
        const isPasswordValid = await bcrypt.compare(password, wallet.password);
        if (!isPasswordValid) {
            throw new WalletError('Invalid wallet password', 403);
        }
    }

    async #findWallet(walletId, userId, transaction) {
        const whereClause = userId ? { id: walletId, userId } : { id: walletId };
        const wallet = await this.#model.findOne({ where: whereClause, transaction });
        if (!wallet) throw new WalletError(`Wallet with ID ${walletId} not found.`, 404);
        return wallet;
    }

    #logTransfer(senderWallet, recipientWallet, amount, fee, currency, transaction) {
        const precision = fiatCurrencies.includes(currency) ? fiatPrecision : cryptoPrecision;
        return Promise.all([
            this.#transaction_model.create({
                walletId: senderWallet.id,
                userId: senderWallet.userId,
                type: 'transfer',
                amount: amount.toFixed(precision),
                currency: currency,
                fee: fee.toFixed(precision),
                status: 'completed'
            }, { transaction }),

            this.#transaction_model.create({
                walletId: recipientWallet.id,
                userId: recipientWallet.userId,
                type: 'transfer',
                amount: amount.toFixed(precision),
                currency: currency,
                fee: '0.00',
                status: 'completed'
            }, { transaction }),

            this.logAuditAction(senderWallet.userId, `Transferred ${amount.toFixed(precision)} from wallet ${senderWallet.id} to wallet ${recipientWallet.id}`, transaction)
        ]);
    }

    #checkDailyLimit(wallet, amount, currency) {
        const today = new Date().toISOString().slice(0, 10);
        if (wallet.lastWithdrawalDate !== today) {
            wallet.withdrawnToday = new BigNumber(0);
        }

        const newWithdrawnToday = wallet.withdrawnToday.plus(amount);
        if (newWithdrawnToday.gt(wallet.dailyLimit)) {
            throw new WalletError(`Daily withdrawal limit exceeded. You can withdraw up to ${wallet.dailyLimit.minus(wallet.withdrawnToday).toFixed(2)} ${currency} more today.`, 400);
        }

        wallet.withdrawnToday = newWithdrawnToday.toFixed(2);
        wallet.lastWithdrawalDate = today;
    }

    async #withdrawFullBalance(wallet, currency, currentBalance, fee, transaction) {
        const feeForFullBalance = this.#calculateFee(currentBalance, this.defaultFees.withdrawal);
        if (currentBalance.lte(feeForFullBalance)) {
            throw new WalletError(`Insufficient balance to cover the withdrawal fee. Your balance is ${currentBalance.toFixed(2)} ${currency}, and the fee is ${feeForFullBalance.toFixed(2)} ${currency}.`, 400);
        }
    
        const withdrawableAmount = currentBalance.minus(feeForFullBalance);
        this.#updateBalance(wallet, currency, currentBalance.negated());
    
        await wallet.save({ transaction });
    
        await this.#transaction_model.create({
            userId: wallet.userId,
            walletId: wallet.id,
            type: 'withdrawal',
            currency,
            amount: withdrawableAmount.toFixed(2),
            fee: feeForFullBalance.toFixed(2),
            status: 'completed'
        }, { transaction });
    
        await this.logAuditAction(wallet.userId, `Withdrew ${withdrawableAmount.toFixed(2)} ${currency} from wallet`, transaction);
    
        return {
                id: wallet.id,
                walletName: wallet.walletName,
                balances: wallet.balances,
                userId: wallet.userId,
                isLocked: wallet.isLocked,
                dailyLimit: wallet.dailyLimit,
                withdrawnToday: wallet.withdrawnToday,
                lastWithdrawalDate: wallet.lastWithdrawalDate,
                withdrawalAmount: withdrawableAmount.toFixed(2),
                fee: feeForFullBalance.toFixed(2),
                remainingBalance: "0.00",
                createdAt: wallet.createdAt,
                updatedAt: wallet.updatedAt
        };
    }
    

    async #logWithdrawal(wallet, userId, walletId, currency, amountBig, fee, transaction) {
        const actualWithdrawAmount = amountBig.minus(fee);
        const remainingBalance = new BigNumber(wallet.balances[currency] || 0).minus(actualWithdrawAmount);
    
        await this.#transaction_model.create({
            userId,
            walletId,
            type: 'withdrawal',
            currency,
            amount: actualWithdrawAmount.toFixed(2),
            fee: fee.toFixed(2),
            status: 'completed'
        }, { transaction });
    
        await this.logAuditAction(userId, `Withdrew ${actualWithdrawAmount.toFixed(2)} ${currency} from wallet`, transaction);
    
        return {
            id: wallet.id,
            walletName: wallet.walletName,
            balances: wallet.balances,
            userId: wallet.userId,
            isLocked: wallet.isLocked,
            dailyLimit: wallet.dailyLimit,
            withdrawnToday: wallet.withdrawnToday,
            lastWithdrawalDate: wallet.lastWithdrawalDate,
            withdrawalAmount: actualWithdrawAmount.toFixed(2),
            fee: fee.toFixed(2),
            remainingBalance: remainingBalance.toFixed(2),
            createdAt: wallet.createdAt,
            updatedAt: wallet.updatedAt
            
        };
    }
    

    #getDefaultExchangeRate(fromCurrency, toCurrency) {
        const defaultRates = defaultExchangeRates[fromCurrency.toUpperCase()];
        if (!defaultRates || !defaultRates[toCurrency.toUpperCase()]) throw new WalletError(`Conversion from ${fromCurrency} to ${toCurrency} is not supported.`, 400);
        return defaultRates[toCurrency.toUpperCase()];
    }
    #processWithdrawal(wallet, currency, totalCost, fee, transaction) {
        this.#updateBalance(wallet, currency, totalCost.negated());
    }
}

module.exports = new WalletService();
