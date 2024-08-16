const {DataTypes, Model} = require("sequelize")
const {sequelize} = require('../../../../config/sequelize')

const UserSchema = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    fullName: {
        type: DataTypes.STRING(30),
        allowNull: true
    },
    username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    otpSecret: {
        type: DataTypes.STRING
    },
    is2FAEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    backupCodes: {
        type: DataTypes.JSON
    },
    failedLoginAttempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    isLocked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    lockedUntil: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW()
    },
    updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
})

module.exports = UserSchema