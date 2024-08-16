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
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
})

User.hasMany(TransactionSchema, {foreignKey: 'userId'})
TransactionSchema.belongsTo(User, {foreignKey: 'userId', as: 'user'})

Wallet.hasMany(TransactionSchema, {foreignKey: 'walletId'})
TransactionSchema.belongsTo(Wallet, {foreignKey: 'walletId', as: 'wallet'})

module.exports = TransactionSchema