const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Review = sequelize.define('Review', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    placeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'places',
            key: 'id'
        }
    },
    rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: { args: [1], msg: 'คะแนนต้องอย่างน้อย 1 ดาว' },
            max: { args: [5], msg: 'คะแนนสูงสุด 5 ดาว' }
        }
    },
    comment: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'reviews',
    timestamps: true
});

module.exports = Review;
