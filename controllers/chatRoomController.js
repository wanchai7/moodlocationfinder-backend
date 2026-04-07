const { ChatRoom, ChatMessage, User } = require('../models');
const { getReceiverSocketId, io } = require('../lib/socket');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');

// For Users: Create or get an open support room (User clicks "Contact")
exports.createOrGetContactRoom = async (req, res) => {
    try {
        const userId = req.user.id;
        
        let room = await ChatRoom.findOne({
            where: { userId, status: 'open' },
            include: [{ model: User, as: 'admin', attributes: ['id', 'firstName', 'lastName', 'profileImage'] }]
        });

        if (!room) {
            room = await ChatRoom.create({ userId, status: 'open' });
        }

        res.status(200).json(room);
    } catch (error) {
        console.error("Error in createOrGetContactRoom: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

// For Admin: Get all contact rooms (View all contacts)
exports.getAllContactRooms = async (req, res) => {
    try {
        const rooms = await ChatRoom.findAll({
            include: [
                { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'profileImage'] },
                { model: User, as: 'admin', attributes: ['id', 'firstName', 'lastName', 'profileImage'] }
            ],
            order: [['updatedAt', 'DESC']]
        });

        res.status(200).json(rooms);
    } catch (error) {
        console.error("Error in getAllContactRooms: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Get messages for a specific room
exports.getRoomMessages = async (req, res) => {
    try {
        const { roomId } = req.params;
        const messages = await ChatMessage.findAll({
            where: { roomId },
            order: [['createdAt', 'ASC']]
        });

        res.status(200).json(messages);
    } catch (error) {
        console.error("Error in getRoomMessages: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Send message to a room
exports.sendMessageToRoom = async (req, res) => {
    try {
        const { text, image } = req.body;
        const { roomId } = req.params;
        const senderId = req.user.id;
        
        const room = await ChatRoom.findByPk(roomId);
        if (!room) return res.status(404).json({ error: "Room not found" });

        // If an admin sends the first message, assign them to the room
        if (req.user.role === 'admin' && room.adminId === null) {
            room.adminId = senderId;
            await room.save();
        }

        let imageUrl = null;
        if (image) {
            const bucketName = process.env.SUPABASE_BUCKET || 'uploads';
            const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            let buffer;
            let contentType = 'image/jpeg';
            if (matches && matches.length === 3) {
                contentType = matches[1];
                buffer = Buffer.from(matches[2], 'base64');
            } else {
                buffer = Buffer.from(image, 'base64');
            }
            const fileExt = contentType.split('/')[1] || 'jpg';
            const fileName = `chat_images/${uuidv4()}.${fileExt}`;
            
            const { data, error } = await supabase.storage
              .from(bucketName)
              .upload(fileName, buffer, { contentType, upsert: true });
              
            if (error) {
                return res.status(500).json({ error: "Failed to upload image to Supabase" });
            }
            const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(fileName);
            imageUrl = urlData.publicUrl;
        }

        // Determine the receiver (if known)
        let receiverId = null;
        if (senderId === room.userId) {
            receiverId = room.adminId; // null if unassigned
        } else if (senderId === room.adminId) {
            receiverId = room.userId;
        }

        const newMessage = await ChatMessage.create({
            senderId,
            receiverId,
            roomId,
            text,
            image: imageUrl,
        });

        room.lastMessage = text || 'Image';
        room.lastMessageAt = new Date();
        await room.save();

        // Realtime Event Emission
        // If receiverId is known and they are online
        if (receiverId) {
            const receiverSocketId = await getReceiverSocketId(receiverId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("newRoomMessage", newMessage);
            }
        } else if (senderId === room.userId) {
            // Emitting to general new ticket channel for admins
            io.emit("newContactRequest", { room, message: newMessage });
        }

        res.status(201).json(newMessage);
    } catch (error) {
        console.error("Error in sendMessageToRoom: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Admin closes room
exports.closeRoom = async (req, res) => {
    try {
        const { roomId } = req.params;
        const room = await ChatRoom.findByPk(roomId);
        if (!room) return res.status(404).json({ error: "Room not found" });

        room.status = 'closed';
        await room.save();

        res.status(200).json({ message: "Room closed successfully", room });
    } catch (error) {
        console.error("Error in closeRoom: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};
