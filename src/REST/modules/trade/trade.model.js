const { DataTypes } = require("sequelize");
const { sequelize } = require("../../../../config/sequelize");
const Wallet = require("../wallet/wallet.model")
const TradeSchema = sequelize.define('Trade', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    walletId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: Wallet,
            key: 'id'
        }
    },
    type: {
        type: DataTypes.ENUM('buy', 'sell'),
        allowNull: false
    },
    currencyPair: {
        type: DataTypes.STRING,
        allowNull: false
    },
    amount: {
        type: DataTypes.DECIMAL(18, 8),
        allowNull: false
    },
    price: {
        type: DataTypes.DECIMAL(18, 8),
        allowNull: false
    },
    total: {
        type: DataTypes.DECIMAL(18, 8),
        allowNull: false
    },
    fee: {
        type: DataTypes.DECIMAL(18, 8),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('pending', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'pending'
    }

}, {
    timestamps: true
})

module.exports = TradeSchema;