const {DataTypes, Model} = require("sequelize")
const {sequelize} = require('../../../../config/sequelize')
const User = require("../user/user.model")
const Wallet = require("../wallet/wallet.model")

const MarketSchema = sequelize.define('Market', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    currencyPair: {
        type: DataTypes.STRING,
        allowNull: false
    },
    price: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    timeStamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
    
})


module.exports = MarketSchema