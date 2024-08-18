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
        allowNull: true,
    },
    phoneNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    otp: {
        type: DataTypes.STRING(10),
        allowNull: true
    },
    otpExpires: {
        type: DataTypes.DATE,
        allowNull: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    is2FAEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    backupCodes: {
        type: DataTypes.JSON,
        allowNull: true
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
    resetPasswordExpires: {
        type: DataTypes.DATE,
        allowNull: true
    },
    resetPasswordToken: {
        type: DataTypes.STRING,
        allowNull: true
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW()
    }
}, {
    // indexes: [
    //     {unique: true, fields: ['username']},
    //     {unique: true, fields: ['phoneNumber']},
    // ]
})
module.exports = UserSchema