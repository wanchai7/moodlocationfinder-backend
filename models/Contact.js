const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Contact = sequelize.define('Contact', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: { msg: 'กรุณากรอกชื่อ' }
        }
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isEmail: { msg: 'รูปแบบอีเมลไม่ถูกต้อง' }
        }
    },
    subject: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: { msg: 'กรุณากรอกหัวข้อ' }
        }
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
            notEmpty: { msg: 'กรุณากรอกรายละเอียด' }
        }
    },
    status: {
        type: DataTypes.ENUM('pending', 'replied'),
        defaultValue: 'pending'
    }
}, {
    tableName: 'contacts',
    timestamps: true
});

module.exports = Contact;
