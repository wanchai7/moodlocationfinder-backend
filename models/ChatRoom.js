const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ChatRoom = sequelize.define('ChatRoom', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    adminId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('open', 'closed'),
        defaultValue: 'open'
    },
    lastMessage: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    lastMessageAt: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'chat_rooms',
    timestamps: true
});

module.exports = ChatRoom;
