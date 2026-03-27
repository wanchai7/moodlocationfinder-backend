const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Favorite = sequelize.define('Favorite', {
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
        type: DataTypes.STRING,
        allowNull: false
    },
    placeName: {
        type: DataTypes.STRING
    },
    placeImage: {
        type: DataTypes.TEXT
    }
}, {
    tableName: 'favorites',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['userId', 'placeId']
        }
    ]
});

module.exports = Favorite;
