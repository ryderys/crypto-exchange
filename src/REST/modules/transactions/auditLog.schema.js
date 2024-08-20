const { DataTypes } = require("sequelize");
const { sequelize } = require("../../../../config/sequelize");
const User = require("../user/user.model")
const AuditLogSchema = sequelize.define('AuditLog', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    action: {
        type: DataTypes.STRING,
        allowNull: false
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    }
}, {
    timestamps: true
})

module.exports = AuditLogSchema