const {DataTypes, Model} = require("sequelize")
const {sequelize} = require('../../../../config/sequelize')
const User = require("../user/user.model")
const Wallet = require("../wallet/wallet.model")

const TransactionSchema = sequelize.define('Transaction', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    type: {
        type: DataTypes.ENUM('deposit', 'withdrawal', 'transfer', 'buy', 'sell'),
        allowNull: false
    },
    sourceWalletId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: Wallet,
            key: 'id'
        }
    },
    destinationWalletId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: Wallet,
            key: 'id'
        }
    },
    amount: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    },
    currency: {
        type: DataTypes.STRING,
        allowNull: false
    },
    cryptoAmount: {
        type: DataTypes.DECIMAL(18, 8), // High precision for cryptocurrency
        allowNull: true // Only applicable for crypto transactions
    },
    price: {
        type: DataTypes.DECIMAL(18, 2), // High precision for cryptocurrency
        allowNull: true // Only applicable for crypto transactions
    },
    fee: {
        type: DataTypes.DECIMAL(18, 8),
        allowNull: true // Only applicable if a fee is charged
    },
    status: {
        type: DataTypes.ENUM('pending', 'completed', 'failed'),
        defaultValue: 'pending' 
    },
    walletId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: Wallet,
            key: 'id'
        }
    }
}, {
    timestamps: true
})

User.hasMany(TransactionSchema, {foreignKey: 'userId'})
TransactionSchema.belongsTo(User, {foreignKey: 'userId', as: 'user'})

Wallet.hasMany(TransactionSchema, {foreignKey: 'walletId'})
TransactionSchema.belongsTo(Wallet, {foreignKey: 'walletId', as: 'wallet'})

Wallet.hasMany(TransactionSchema, {foreignKey: 'sourceWalletId'})
TransactionSchema.belongsTo(Wallet, {foreignKey: 'sourceWalletId', as: 'sourceWallet'})

Wallet.hasMany(TransactionSchema, {foreignKey: 'destinationWalletId'})
TransactionSchema.belongsTo(Wallet, {foreignKey: 'destinationWalletId', as: 'destinationWallet'})

module.exports = TransactionSchema