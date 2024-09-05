// models/limitOrder.model.js
const { DataTypes } = require('sequelize');
const { sequelize } = require("../../../../config/sequelize");

const LimitOrder = sequelize.define('LimitOrder', {
    userId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    walletId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    crypto: {
        type: DataTypes.STRING,
        allowNull: false
    },
    price: {
        type: DataTypes.DECIMAL(18, 8),
        allowNull: false
    },
    amount: {
        type: DataTypes.DECIMAL(18, 8),
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('buy', 'sell'),
        allowNull: false
    },
    orderType: {
        type: DataTypes.ENUM('limit', 'stop'),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('open', 'executed', 'cancelled'),
        defaultValue: 'open'
    }
}, {
    timestamps: true
});

module.exports = LimitOrder;
