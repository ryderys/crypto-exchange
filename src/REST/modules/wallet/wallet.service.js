const autoBind = require("auto-bind");
const bcrypt = require("bcrypt")

const Wallet = require("./wallet.model")
const Transaction = require("../transactions/transactions.model")
const saltRounds = process.env.SALT_ROUNDS || 12;

class WalletService {
    #model
    #transaction_model;
    constructor(){
        autoBind(this)
        this.#model = Wallet
        this.#transaction_model = Transaction
    }

    async createWallet(userId, currency, password){
        const hashedPassword = await bcrypt.hash(password, saltRounds)

        const wallet = await Wallet.create({
            userId,
            currency,
            password: hashedPassword,
            balance: 0.0,
        })
        return wallet
    }

    async getWalletByUserId(userId){
        const wallets = await Wallet.findAll({
            where: {userId},
            attributes: ['id', 'balance', 'currency', 'createdAt', 'updatedAt']
        })
        if(!wallets) throw new Error('no wallets found for this user')
        return wallets
    }

    async depositFunds(walletId, amount){
        const wallet = await Wallet.findByPk(walletId)
        if(!wallet) throw new Error('Wallet not found')
        
        wallet.balance += +amount
        await wallet.save()
        return wallet
    }

    async withdrawFunds(walletId, amount, password){
        const wallet = await Wallet.findByPk(walletId)
        if(!wallet) throw new Error('wallet not found')

        const isPasswordValid = await bcrypt.compare(password, wallet.password)
        if(!isPasswordValid) throw new Error('invalid wallet password')
        
        if (wallet.balance < +amount) throw new Error('insufficient balance')

        wallet.balance -= +amount
        await wallet.save()
        return wallet
    }

    async transferFunds(senderWalletId, recipientWalletId, amount, password){
        const senderWallet = await Wallet.findByPk(senderWalletId)
        const recipientWallet = await Wallet.findByPk(recipientWalletId)

        if(!senderWallet || !recipientWallet) throw new Error('One of the wallets was not found')

        const isPasswordValid = await bcrypt.compare(password, senderWallet.password)
        if(!isPasswordValid) throw new Error('Invalid wallet password')

        if(senderWallet.balance < amount) throw new Error('insufficient balance')

        senderWallet.balance -= +amount
        recipientWallet.balance += +amount

        await senderWallet.save()
        await recipientWallet.save()

        return {senderWallet, recipientWallet}
    }

    async getTransactionHistory(walletId){
        const transactions = await Transaction.findAll({
            where: {walletId},
            order: [['createdAt', 'DESC']]
        })

        if(!transactions) throw new Error('No transactions found for this wallet')
        return transactions
    }

    async validateWalletPassword(walletId, password){
        const wallet = await Wallet.findByPk(walletId)
        if(!wallet) throw new Error('Wallet not found')

        const isPasswordValid = await bcrypt.compare(password, wallet.password)
        if(!isPasswordValid) throw new Error('Invalid wallet password')

        return true
    }

    async checkBalance(walletId){
        const wallet = await Wallet.findByPk(walletId)
        if(!wallet) throw new Error('Wallet not found')

        return {balance: wallet.balance}
    }


}
module.exports = new WalletService()