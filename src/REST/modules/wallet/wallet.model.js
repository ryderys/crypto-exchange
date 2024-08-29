const {DataTypes, Model} = require("sequelize")
const {sequelize} = require('../../../../config/sequelize')
const User = require("../user/user.model")

const WalletSchema = sequelize.define('Wallet', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    walletName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    balances: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {}
    },
    // currency: {
    //     type: DataTypes.STRING,
    //     allowNull: false,
    // },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    isLocked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    dailyLimit: {
        type: DataTypes.FLOAT,
        defaultValue: 1000.0,
        allowNull: false
    },
    withdrawnToday: {
        type: DataTypes.FLOAT,
        defaultValue: 0.0,
        allowNull: false
    },
    lastWithdrawalDate: {
        type: DataTypes.DATE,
        allowNull: true
    },

}, {
    timestamps: true,
    // indexes: [
    //     {fields: ['userId']},
    //     { unique: true, fields: ['userId', 'currency']}
    // ]
})

User.hasMany(WalletSchema, {foreignKey: 'userId', as: 'wallets'})
WalletSchema.belongsTo(User, {foreignKey: 'userId', as: 'user'})

module.exports = WalletSchema