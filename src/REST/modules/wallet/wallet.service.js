const autoBind = require("auto-bind");
const bcrypt = require("bcrypt")
const BigNumber = require("bignumber.js")
const Wallet = require("./wallet.model")
const Transaction = require("../transactions/transactions.model");
const { sequelize } = require("../../../../config/sequelize");
const AuditLog = require("../transactions/auditLog.schema");
const { default: axios } = require("axios");
const saltRounds = process.env.SALT_ROUNDS || 12;

class WalletService {
    #model
    #transaction_model;
    #auditLog_model;
    constructor(){
        autoBind(this)
        this.#model = Wallet
        this.#transaction_model = Transaction
        this.#auditLog_model = AuditLog
    }

    async logAuditAction(userId, action, transaction = null){
        await this.#auditLog_model.create({
            action,
            userId
        }, {transaction})
    }

    async getCoinPrice(currency){
        try {
            const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
                params: {
                    ids: currency,
                    vs_currencies: 'usd' // Convert to USD
                }
            })
            return response.data[currency].usd
        } catch (error) {
            console.error('Error fetching coin price:', error)
            throw new Error('Error fetching coin price');
        }
    }

    async createWallet(userId, currency, password){
        return sequelize.transaction(async (t) => {
            
            const existingWallet = await this.#model.findOne({
                where: {userId, currency},
                transaction: t
            })

            if(existingWallet){
                throw new Error(`Wallet with currency ${currency} already exists for this user.`)
            }
            const hashedPassword = await bcrypt.hash(password, saltRounds)
            
            const wallet = await this.#model.create({
                userId,
                currency,
                password: hashedPassword,
                balance: 0.0,
            }, {transaction: t})
            
            await this.logAuditAction(userId, 'Created wallet', t)
            return wallet
        })
    }

    async getWalletByUserId(userId){
        const wallets = await this.#model.findAll({
            where: {userId},
            attributes: ['id', 'balance', 'currency', 'createdAt', 'updatedAt']
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

    async depositFundsByCurrency(userId, currency ,amount){
        const amountBig = new BigNumber(amount)
        if(amountBig.isNaN() || amountBig.lte(0)) throw new Error('Invalid deposit amount')

        return sequelize.transaction(async (t) => {
            const wallet = await this.#model.findOne({
                where: {userId, currency},
                transaction: t
            })

            if(!wallet) throw new Error(`Wallet for currency ${currency} not found for user`)
            if(wallet.isLocked) throw new Error(`Wallet for currency ${currency} is locked`)
            
            await wallet.increment('balance', {by: amountBig.toFixed(), transaction: t})
            await wallet.save({transaction: t})

            await this.#transaction_model.create({
                walletId: wallet.id,
                userId: wallet.userId,
                type: 'deposit',
                amount: amountBig.toFixed(),
                status: 'completed'
            }, {transaction: t})

            await this.logAuditAction(wallet.userId, `Deposited ${amount} ${currency} to wallet`, t)
            return wallet
        })
    }

    async withdrawFunds(walletId, amount, password){

        const amountBig = new BigNumber(amount)
        if(amountBig.isNaN() || amountBig.lte(0)) throw new Error('Invalid deposit amount')

        return sequelize.transaction(async (t) => {
            const wallet = await this.#model.findByPk(walletId, {transaction: t})
            if(!wallet) throw new Error('wallet not found')
            if(wallet.isLocked) throw new Error(`Wallet ${walletId} is locked`)
            
            const isPasswordValid = await bcrypt.compare(password, wallet.password)
            if(!isPasswordValid) throw new Error('invalid wallet password')

            const today = new Date().toISOString().slice(0, 10)
            if(wallet.lastWithdrawalDate !== today){
                wallet.withdrawnToday = 0.0;
                wallet.lastWithdrawalDate = today
            }

            if (new BigNumber(wallet.withdrawnToday).plus(amountBig).gt(wallet.dailyLimit)) {
                throw new Error('Daily withdrawal limit exceeded');
            }

            if (new BigNumber(wallet.balance).lt(amountBig)) throw new Error('Insufficient balance');

            await wallet.decrement('balance', {by: amountBig.toFixed(), transaction: t})
            wallet.withdrawnToday = new BigNumber(wallet.withdrawnToday).plus(amountBig).toFixed();
            await wallet.save({transaction: t})

            await this.#transaction_model.create({
                walletId: wallet.id,
                userId: wallet.userId,
                type: 'withdrawal',
                amount,
                status: 'completed'
            }, {transaction: t})

            await this.logAuditAction(wallet.userId, `Withdrew ${amount} from wallet`, t)
            

            return wallet
        })
    }

    async transferFunds(senderWalletId, recipientWalletId, amount, password){
        const amountBig = new BigNumber(amount)
        if(amountBig.isNaN() || amountBig.lte(0)) throw new Error('Invalid transfer amount')

        return sequelize.transaction(async (t) => {
            const senderWallet = await this.#model.findByPk(senderWalletId,{transaction: t})
            const recipientWallet = await this.#model.findByPk(recipientWalletId,{transaction: t})
    
            if(!senderWallet || !recipientWallet) throw new Error('One of the wallets was not found')
            if (senderWallet.isLocked || recipientWallet.isLocked) throw new Error('One of the wallets is locked');

            const isPasswordValid = await bcrypt.compare(password, senderWallet.password)
            if(!isPasswordValid) throw new Error('Invalid wallet password')
            
            if (new BigNumber(senderWallet.balance).lt(amountBig)) throw new Error('Insufficient balance')
            
            await senderWallet.decrement('balance', {by: amountBig.toFixed(), transaction: t})
            await recipientWallet.increment('balance', {by: amountBig.toFixed(), transaction: t})

            await this.#transaction_model.create({
                walletId: senderWallet.id,
                userId: senderWallet.userId,
                type: 'transfer',
                amount,
                status: 'completed'
            }, { transaction: t });
    
            await this.#transaction_model.create({
                walletId: recipientWallet.id,
                userId: recipientWallet.userId,
                type: 'transfer',
                amount,
                status: 'completed'
            }, { transaction: t });
            await this.logAuditAction(senderWallet.userId, `Transferred ${amount} from wallet ${senderWalletId} to wallet ${recipientWalletId}`, t);
            return {senderWallet, recipientWallet}
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

    async validateWalletPassword(walletId, password){
        const wallet = await this.#model.findByPk(walletId)
        if(!wallet) throw new Error('Wallet not found')

        const isPasswordValid = await bcrypt.compare(password, wallet.password)
        if(!isPasswordValid) throw new Error('Invalid wallet password')

        return true
    }

    async checkBalance(walletId){
        const wallet = await this.#model.findByPk(walletId)
        if(!wallet) throw new Error('Wallet not found')

        return {balance: new BigNumber(wallet.balance).toFixed(8)}
    }


}
module.exports = new WalletService()