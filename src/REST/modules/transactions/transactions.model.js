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
        type: DataTypes.ENUM('deposit', 'withdrawal', 'transfer'),
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