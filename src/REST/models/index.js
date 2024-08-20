const {sequelize} = require("../../../config/sequelize")

const userModel = require("../modules/user/user.model")
const orderModel = require("../modules/order/order.model")
const marketModel = require("../modules/market/market-data.model")
const transactionModel = require("../modules/transactions/transactions.model")
const walletModel = require("../modules/wallet/wallet.model")

const models = {
    User: userModel,
    Order: orderModel,
    Market: marketModel,
    Transaction: transactionModel,
    Wallet: walletModel
}


const syncModels = async () => {
    try {
        await sequelize.sync({force: true})
        console.log('Models synchronized successfully');
        
    } catch (error) {
        console.error('Failed to synchronize models:', error);
    }
}
module.exports = {
    models,
    syncModels
}