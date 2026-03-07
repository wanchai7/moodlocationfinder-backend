const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ChatMessage = sequelize.define('ChatMessage', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    chatRoomId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'ID ห้องแชท'
    },
    senderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'ID ผู้ส่งข้อความ'
    },
    senderRole: {
        type: DataTypes.ENUM('user', 'admin'),
        allowNull: false,
        comment: 'บทบาทของผู้ส่ง (user หรือ admin)'
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'เนื้อหาข้อความ'
    },
    image: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL รูปภาพ (ถ้ามี)'
    },
    isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'อ่านแล้วหรือยัง'
    }
}, {
    tableName: 'chat_messages',
    timestamps: true
});

module.exports = ChatMessage;
