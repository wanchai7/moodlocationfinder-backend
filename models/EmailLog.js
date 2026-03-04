const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const EmailLog = sequelize.define('EmailLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    recipientEmail: {
        type: DataTypes.STRING,
        allowNull: false
    },
    subject: {
        type: DataTypes.STRING,
        allowNull: false
    },
    body: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    template: {
        type: DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('sent', 'failed'),
        defaultValue: 'sent'
    },
    errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    sentBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    }
}, {
    tableName: 'email_logs',
    timestamps: true
});

module.exports = EmailLog;
