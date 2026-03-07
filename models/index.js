const { sequelize } = require('../config/db');
const User = require('./User');
const Place = require('./Place');
const Review = require('./Review');
const Favorite = require('./Favorite');
const History = require('./History');
const Contact = require('./Contact');
const EmailLog = require('./EmailLog');
const ChatRoom = require('./ChatRoom');
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

// Place -> Favorites
Place.hasMany(Favorite, { foreignKey: 'placeId', as: 'favorites' });
Favorite.belongsTo(Place, { foreignKey: 'placeId', as: 'place' });

// User -> History
User.hasMany(History, { foreignKey: 'userId', as: 'histories' });
History.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Place -> History
Place.hasMany(History, { foreignKey: 'placeId', as: 'histories' });
History.belongsTo(Place, { foreignKey: 'placeId', as: 'place' });

// User -> Contact
User.hasMany(Contact, { foreignKey: 'userId', as: 'contacts' });
Contact.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User -> EmailLog (sentBy)
User.hasMany(EmailLog, { foreignKey: 'sentBy', as: 'emailLogs' });
EmailLog.belongsTo(User, { foreignKey: 'sentBy', as: 'sender' });

// ========== Chat Associations ==========

// User -> ChatRooms (as user)
User.hasMany(ChatRoom, { foreignKey: 'userId', as: 'chatRoomsAsUser' });
ChatRoom.belongsTo(User, { foreignKey: 'userId', as: 'chatUser' });

// User -> ChatRooms (as admin)
User.hasMany(ChatRoom, { foreignKey: 'adminId', as: 'chatRoomsAsAdmin' });
ChatRoom.belongsTo(User, { foreignKey: 'adminId', as: 'chatAdmin' });

// ChatRoom -> ChatMessages
ChatRoom.hasMany(ChatMessage, { foreignKey: 'chatRoomId', as: 'messages' });
ChatMessage.belongsTo(ChatRoom, { foreignKey: 'chatRoomId', as: 'chatRoom' });

// User -> ChatMessages (sender)
User.hasMany(ChatMessage, { foreignKey: 'senderId', as: 'sentMessages' });
ChatMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

module.exports = {
    sequelize,
    User,
    Place,
    Review,
    Favorite,
    History,
    Contact,
    EmailLog,
    ChatRoom,
    ChatMessage
};
