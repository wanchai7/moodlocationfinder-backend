const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const History = sequelize.define('History', {
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
    visitedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'histories',
    timestamps: true
});

module.exports = History;
