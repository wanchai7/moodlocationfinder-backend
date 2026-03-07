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
        allowNull: false,
        comment: 'ID ของ user ที่เปิดห้องแชท'
    },
    adminId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'ID ของ admin ที่รับเรื่อง (null = ยังไม่มี admin รับ)'
    },
    status: {
        type: DataTypes.ENUM('open', 'closed'),
        defaultValue: 'open',
        comment: 'สถานะห้องแชท'
    },
    lastMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'ข้อความล่าสุดในห้อง (สำหรับแสดง preview)'
    },
    lastMessageAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'เวลาข้อความล่าสุด'
    }
}, {
    tableName: 'chat_rooms',
    timestamps: true
});

module.exports = ChatRoom;
