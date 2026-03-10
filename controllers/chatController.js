const { ChatMessage, User } = require('../models');
const { getReceiverSocketId, io } = require('../lib/socket');
const { Op } = require('sequelize');
const cloudinary = require('../config/cloudinary');

exports.getUsersForSidebar = async (req, res) => {
    try {
        const loggedInUserId = req.user.id; // From middleware

        // ดึงรายชื่อ user ทั้งหมด ยกเว้นตัวเอง และไม่รวม password
        const filteredUsers = await User.findAll({
            where: {
                id: { [Op.ne]: loggedInUserId }
            },
            attributes: { exclude: ['password'] }
        });

        const usersWithDetails = await Promise.all(
            filteredUsers.map(async (user) => {
                const userJSON = user.toJSON();
                // Find latest message between these two users
                const latestMessage = await ChatMessage.findOne({
                    where: {
                        [Op.or]: [
                            { senderId: loggedInUserId, receiverId: user.id },
                            { senderId: user.id, receiverId: loggedInUserId }
                        ]
                    },
                    order: [['createdAt', 'DESC']]
                });

                const unreadCount = await ChatMessage.count({
                    where: {
                        senderId: user.id,
                        receiverId: loggedInUserId,
                        isRead: false
                    }
                });

                return {
                    ...userJSON,
                    latestMessage,
                    unreadCount
                };
            })
        );

        // Sort users by latest message (descending)
        usersWithDetails.sort((a, b) => {
            const timeA = a.latestMessage ? new Date(a.latestMessage.createdAt).getTime() : 0;
            const timeB = b.latestMessage ? new Date(b.latestMessage.createdAt).getTime() : 0;
            return timeB - timeA;
        });

        res.status(200).json(usersWithDetails);
    } catch (error) {
        console.error("Error in getUsersForSidebar: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

exports.getMessages = async (req, res) => {
    try {
        const { id: userToChatId } = req.params;
        const myId = req.user.id;

        const messages = await ChatMessage.findAll({
            where: {
                [Op.or]: [
                    { senderId: myId, receiverId: userToChatId },
                    { senderId: userToChatId, receiverId: myId }
                ]
            },
            order: [['createdAt', 'ASC']]
        });

        res.status(200).json(messages);
    } catch (error) {
        console.error("Error in getMessages: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const { text, image } = req.body;
        const { id: receiverId } = req.params;
        const senderId = req.user.id;

        let imageUrl = null;
        if (image) {
            // Upload base64 image to cloudinary
            const uploadResponse = await cloudinary.uploader.upload(image, {
                folder: 'chat_images',
                resource_type: 'image'
            });
            imageUrl = uploadResponse.secure_url;
        }

        const newMessage = await ChatMessage.create({
            senderId,
            receiverId,
            text,
            image: imageUrl,
        });

        // realtime functionality => socket.io
        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", newMessage);
        }

        const senderSocketId = getReceiverSocketId(senderId);
        if (senderSocketId && receiverSocketId !== senderSocketId) {
            io.to(senderSocketId).emit("newMessage", newMessage);
        }

        res.status(201).json(newMessage);
    } catch (error) {
        console.error("Error in sendMessage: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

exports.markMessagesAsRead = async (req, res) => {
    try {
        const { id: senderId } = req.params;
        const myId = req.user.id;

        await ChatMessage.update(
            { isRead: true },
            {
                where: {
                    senderId: senderId,
                    receiverId: myId,
                    isRead: false
                }
            }
        );

        const senderSocketId = getReceiverSocketId(senderId);
        if (senderSocketId) {
            io.to(senderSocketId).emit("messagesRead", { readerId: myId });
        }

        res.status(200).json({ message: "Messages marked as read" });
    } catch (error) {
        console.error("Error in markMessagesAsRead: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};
