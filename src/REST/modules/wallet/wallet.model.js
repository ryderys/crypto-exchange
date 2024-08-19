const {DataTypes, Model} = require("sequelize")
const {sequelize} = require('../../../../config/sequelize')
const User = require("../user/user.model")

const WalletSchema = sequelize.define('Wallet', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    balance: {
        type: DataTypes.DECIMAL(20, 8),
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
    }
}, {
    timestamps: true,
    indexes: [
        {fields: ['userId']},
        { unique: true, fields: ['userId', 'currency']}
    ]
})

User.hasMany(WalletSchema, {foreignKey: 'userId', as: 'wallets'})
WalletSchema.belongsTo(User, {foreignKey: 'userId', as: 'user'})

module.exports = WalletSchema