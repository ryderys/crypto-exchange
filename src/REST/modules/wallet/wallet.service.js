const autoBind = require("auto-bind");
const bcrypt = require("bcrypt")
const BigNumber = require("bignumber.js")
const Wallet = require("./wallet.model")
const Transaction = require("../transactions/transactions.model");
const { sequelize } = require("../../../../config/sequelize");
const AuditLog = require("../transactions/auditLog.schema");
const saltRounds = process.env.SALT_ROUNDS || 12;

const defaultExchangeRates = {
    USD: { EUR: 0.85, BTC: 0.000022, ETH: 0.00032 },
    EUR: { USD: 1.18, BTC: 0.000025, ETH: 0.00038 },
    BTC: { USD: 45000, EUR: 38000, ETH: 14.5 },
    ETH: { USD: 3100, EUR: 2600, BTC: 0.068 }
};

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


    async createWallet(userId, walletName, currency, password){
        const supportedFiatCurrencies = ['USD', 'EUR']
        if(!supportedFiatCurrencies.includes(currency.toUpperCase())){
            throw new Error(`Currency ${currency} is not supported please choose from ${supportedFiatCurrencies}`)
        }
        return sequelize.transaction(async (t) => {
            if(!this.#isCurrencySupported(currency)){
                throw new Error(`Currency ${currency} is not supported.`)
            }

            const existingWallet = await this.#model.findOne({
                where: { userId, currency },
                transaction: t
            });

            if(existingWallet){
                throw new Error(`Wallet with currency ${currency} already exists for this user.`);
            }

            const hashedPassword = await bcrypt.hash(password, saltRounds);
            const wallet = await this.#model.create({
                userId,
                walletName,
                currency,
                password: hashedPassword,
                balances: {}
            }, { transaction: t });

            await this.logAuditAction(userId, `Created wallet with ${currency}`, t);
            return wallet;
        })
    }

    async getWalletByUserId(userId){
        const wallets = await this.#model.findAll({
            where: {userId},
            attributes: ['id', 'walletName' ,'balances', 'currency', 'createdAt', 'updatedAt']
        })
        if(!wallets) throw new Error('no wallets found for this user')
        return wallets
    }

    async lockWallet(walletId){
        return sequelize.transaction(async (t) => {
            const wallet = await this.#model.findByPk(walletId, {transaction: t})
            if(!wallet) throw new Error("wallet not found")
    
            wallet.isLocked = true
            await wallet.save({transaction: t})
    
            await this.logAuditAction(wallet.userId, `Locked wallet ${walletId}`, t)
            return wallet
        })
    }

    async unlockWallet(walletId){
        return sequelize.transaction(async (t) => {
            const wallet = await this.#model.findByPk(walletId, {transaction: t})
            if(!wallet) throw new Error('wallet not found')
            
            wallet.isLocked = false;
            await wallet.save({transaction: t})
    
            await this.logAuditAction(wallet.userId, `Unlocked wallet ${walletId}`, t)
        })
    }

    async depositFunds(userId, walletId, currency ,amount, preferredCurrency = null){
        if (typeof amount !== 'number' && typeof amount !== 'string') {
            throw new Error('Invalid amount type. Must be a number or string.');
        }
        const amountBig = new BigNumber(amount)
        if (amountBig.isNaN() || amountBig.lte(0)) {
            throw new Error('Invalid deposit amount');
        }
        const fee = this.#calculateFee(amountBig, this.defaultFees.deposit)
        const finalAmount = amountBig.minus(fee)

        await this.retryTransaction(async () => {
            await sequelize.transaction(async (t) => {
                const wallet = await this.#findWallet(walletId, userId, t)
                if(wallet.currency !== currency.toUpperCase()){
                    throw new Error(`This wallet only accepts deposits in ${wallet.currency}.`)
                }
                let depositAmount = finalAmount

                console.log('Final amount after fee:', finalAmount.toString());
    
                if(preferredCurrency && preferredCurrency !== currency){
                    depositAmount = this.#convertCurrency(depositAmount, currency, preferredCurrency)
                    currency = preferredCurrency;
                }
    
                this.#updateBalance(wallet, currency, depositAmount)
                console.log('updated balance', wallet.balances);
                
                const result = await wallet.save({transaction: t})
                console.log('Wallet saved:', wallet.balances)
                await wallet.reload({transaction: t})
                console.log('Wallet reloaded:', wallet.balances);
               
               console.log('result' , result);
               
                await this.#transaction_model.create({
                    userId,
                    walletId,
                    type: 'deposit',
                    currency,
                    amount: depositAmount.toFixed(8),
                    fee: fee.toFixed(8),
                    status: 'completed'
                }, {transaction: t})
                await this.logAuditAction(userId, `Deposited ${finalAmount} ${currency} to wallet`, t);
                return wallet
            })
        })
    }

    async withdrawFunds(walletId, userId, currency, amount, preferredCurrency = null){
        const amountBig = new BigNumber(amount)

        const fee = this.#calculateFee(amountBig, this.defaultFees.withdrawal)
        const finalAmount = amountBig.minus(fee)

        return sequelize.transaction( async (t) => {
                const wallet = await this.#findWallet(walletId, userId, t)
                
                let withdrawalAmount = finalAmount

                if(preferredCurrency && preferredCurrency !== currency){
                    withdrawalAmount = this.#convertCurrency(withdrawalAmount, currency, preferredCurrency)
                    currency = preferredCurrency
                }

                this.#checkSufficientBalance(wallet, currency, withdrawalAmount)
                this.#updateBalance(wallet, currency, withdrawalAmount.negated())
                
                await wallet.save({transaction: t})

                await this.#transaction_model.create({
                    userId,
                    walletId,
                    type: 'withdrawal',
                    currency,
                    amount: withdrawalAmount.toFixed(8),
                    fee,
                    status: 'completed'
                }, {transaction: t})

                await this.logAuditAction(userId, `Withdrew ${finalAmount} ${currency} from wallet`, t);
                return wallet
            })
        }

    async transferFunds(senderWalletId, recipientWalletId, amount, password){
        const amountBig = new BigNumber(amount)


        return sequelize.transaction(async (t) => {
            const senderWallet = await this.#model.findByPk(senderWalletId,{transaction: t})
            const recipientWallet = await this.#model.findByPk(recipientWalletId,{transaction: t})
    
            if(!senderWallet || !recipientWallet) throw new Error('One of the wallets was not found')
            if (senderWallet.isLocked || recipientWallet.isLocked) throw new Error('One of the wallets is locked');

            await this.#validateWalletPassword(senderWallet, password)            

            this.#checkSufficientBalance(senderWallet, senderWallet.currency, amountBig);
            this.#updateBalance(senderWallet, senderWallet.currency, amountBig.negated());
            this.#updateBalance(recipientWallet, recipientWallet.currency, amountBig);


            await senderWallet.save({transaction: t})
            await recipientWallet.save({transaction: t})

            await this.#logTransfer(senderWallet, recipientWallet, amountBig, t)
        })
    }

    async getTransactionHistory(walletId){
        const transactions = await this.#transaction_model.findAll({
            where: {walletId},
            order: [['createdAt', 'DESC']]
        })

        if(!transactions) throw new Error('No transactions found for this wallet')
        return transactions
    }

    // async validateWalletPassword(walletId, password){
    //     const wallet = await this.#model.findByPk(walletId)
    //     if(!wallet) throw new Error('Wallet not found')

    //     const isPasswordValid = await bcrypt.compare(password, wallet.password)
    //     if(!isPasswordValid) throw new Error('Invalid wallet password')

    //     return true
    // }

    async checkBalance(walletId){
        const wallet = await this.#model.findByPk(walletId)
        if(!wallet) throw new Error('Wallet not found')

        return {balance: wallet.balances}
    }

    async convertFunds(userId,walletId, fromCurrency, toCurrency, amount){
        const amountBig = new BigNumber(amount)
        const rate = await this.getExchangeRate(fromCurrency, toCurrency);

        if(!rate || rate <= 0){
            throw new Error(`Invalid exchange rate from ${fromCurrency} to ${toCurrency}`)
        }
        
        const convertedAmount = amountBig.multipliedBy(rate);

        return sequelize.transaction(async (t) => {
            const wallet = await this.#findWallet(walletId, userId, t);
            
            this.#checkSufficientBalance(wallet, fromCurrency, amountBig)
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
                const rates = defaultExchangeRates[fromCurrency]
            if(!rates || !rates[toCurrency]){
                throw new Error(`Conversion from ${fromCurrency} to ${toCurrency} is not supported.`)
            }
            return rates[toCurrency]
            } catch (error) {
                throw new Error(`Failed to fetch exchange rate from ${fromCurrency} to ${toCurrency}: ${error.message}`)
            }
    }
    
    async getSupportedCurrencies(){
        const currencies = {
            USD: { description: 'United States Dollar' },
            EUR: { description: 'Euro' },
            BTC: { description: 'Bitcoin' },
            ETH: { description: 'Ethereum' }
        };
        return currencies;
    }

    async retryTransaction(cb, retries = 3, delay = 1000){
        for (let i = 0; i < retries; i++) {
            try {
                return await cb();
            } catch (error) {
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

    #calculateFee(amount, feePercentage){
        const amountBig = new BigNumber(amount)

        const fee = amountBig.multipliedBy(feePercentage);
        if (feePercentage < 0 || feePercentage > 1) {
            throw new Error('Invalid fee percentage');
        }
        return fee;
    }

    #updateBalance(wallet, currency, amount) {
        const currentBalance = new BigNumber(wallet.balances[currency] || 0);
        const newBalance = currentBalance.plus(amount).toFixed(8);

        // Update the wallet's balance for the given currency
        wallet.balances[currency] = newBalance;

        // Explicitly mark the balances field as changed
        wallet.setDataValue('balances', wallet.balances);
        wallet.changed('balances', true);

        // Log for debugging
        console.log(`Updated balance for ${currency}: ${newBalance}`);
    }

    #checkSufficientBalance(wallet, currency, amount) {
        const balance = new BigNumber(wallet.balances[currency] || 0);
        if (balance.lt(amount)) {
        throw new Error(`Insufficient balance. You have ${balance.toFixed(8)} ${currency} but tried to process ${amount.toFixed(8)} ${currency}.`);
    }
    }

   async #convertCurrency(amount, fromCurrency, toCurrency){
        const rate = await this.getExchangeRate(fromCurrency, toCurrency);
        if (!rate) {
            throw new Error(`Exchange rate for ${fromCurrency} to ${toCurrency} is not available.`);
        }
        const convertedAmount = amount.multipliedBy(rate);
        console.log(`Converted amount: ${convertedAmount.toFixed(8)}`);
        return convertedAmount;
    }

    async #validateWalletPassword(wallet, password){
        const isPasswordValid = await bcrypt.compare(password, wallet.password)
        if( !isPasswordValid){
            throw new Error('Invalid wallet password')
        }
    }

    async #findWallet(walletId, userId, transaction){
        const wallet = await this.#model.findOne({ where: { id: walletId, userId }, transaction });
        if (!wallet) throw new Error(`Wallet with ID ${walletId} not found for user ${userId}.`);
        if (wallet.isLocked) throw new Error('Wallet is locked. Please unlock it to perform transactions.');
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

    #isCurrencySupported(currency){
        return Object.keys(defaultExchangeRates).includes(currency.toUpperCase())
    }
    

}
module.exports = new WalletService()