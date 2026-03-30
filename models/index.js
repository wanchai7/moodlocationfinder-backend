const { sequelize } = require('../config/db');
const User = require('./User');
const Place = require('./Place');
const Review = require('./Review');
const Favorite = require('./Favorite');
const History = require('./History');
const ChatMessage = require('./ChatMessage');

// ========== Associations ==========

// User -> Reviews
User.hasMany(Review, { foreignKey: 'userId', as: 'reviews' });
Review.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Place -> Reviews
Place.hasMany(Review, { foreignKey: 'placeId', as: 'reviews' });
Review.belongsTo(Place, { foreignKey: 'placeId', as: 'place' });

// User -> Favorites
User.hasMany(Favorite, { foreignKey: 'userId', as: 'favorites' });
Favorite.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// ❌ ลบส่วนนี้ทิ้ง (Place -> Favorites)
// Place.hasMany(Favorite, { foreignKey: 'placeId', as: 'favorites' });
// Favorite.belongsTo(Place, { foreignKey: 'placeId', as: 'place' });

// User -> History
User.hasMany(History, { foreignKey: 'userId', as: 'histories' });
History.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// ❌ ลบส่วนนี้ทิ้ง (Place -> History)
// Place.hasMany(History, { foreignKey: 'placeId', as: 'histories' });
// History.belongsTo(Place, { foreignKey: 'placeId', as: 'place' });

// ========== Chat Associations ==========

// User -> ChatMessages (sender)
User.hasMany(ChatMessage, { foreignKey: 'senderId', as: 'sentMessages' });
ChatMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

// User -> ChatMessages (receiver)
User.hasMany(ChatMessage, { foreignKey: 'receiverId', as: 'receivedMessages' });
ChatMessage.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });

module.exports = {
    sequelize,
    User,
    Place,
    Review,
    Favorite,
    History,
    ChatMessage
};
