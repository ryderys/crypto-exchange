const {DataTypes, Model} = require("sequelize")
const {sequelize} = require('../../../../config/sequelize')
const User = require("../user/user.model")

const WalletSchema = sequelize.define('Wallet', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    ballance: {
        type: DataTypes.FLOAT,
        defaultValue: 0.0,
        allowNull: false
    },
    currency: {
        type: DataTypes.STRING,
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
    password: {
        type: DataTypes.STRING,
        allowNull: false
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

User.hasMany(WalletSchema, {foreignKey: 'userId', as: 'user'})
WalletSchema.belongsTo(User, {foreignKey: 'userId', as: 'wallets'})

module.exports = WalletSchema