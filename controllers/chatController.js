const { ChatRoom, ChatMessage, User } = require('../models');
const { getReceiverSocketId, io } = require('../lib/socket');
const { Op } = require('sequelize');
const cloudinary = require('../config/cloudinary');

// =============================================
// USER: เปิดห้องแชทกับ Admin
// =============================================
exports.createOrGetChatRoom = async (req, res) => {
    try {
        const userId = req.user.id;

        // ค้นหาห้องแชทที่เปิดอยู่แล้วของ user นี้
        let chatRoom = await ChatRoom.findOne({
            where: {
                userId: userId,
                status: 'open'
            },
            include: [
                {
                    model: User,
                    as: 'chatUser',
                    attributes: ['id', 'firstName', 'lastName', 'profileImage']
                },
                {
                    model: User,
                    as: 'chatAdmin',
                    attributes: ['id', 'firstName', 'lastName', 'profileImage']
                }
            ]
        });

        // ถ้ายังไม่มีห้องแชท ให้สร้างใหม่
        if (!chatRoom) {
            chatRoom = await ChatRoom.create({
                userId: userId,
                status: 'open'
            });

            // ดึงข้อมูลพร้อม include อีกครั้ง
            chatRoom = await ChatRoom.findByPk(chatRoom.id, {
                include: [
                    {
                        model: User,
                        as: 'chatUser',
                        attributes: ['id', 'firstName', 'lastName', 'profileImage']
                    },
                    {
                        model: User,
                        as: 'chatAdmin',
                        attributes: ['id', 'firstName', 'lastName', 'profileImage']
                    }
                ]
            });

            // แจ้ง admin ทุกคนที่ออนไลน์ว่ามีห้องแชทใหม่
            io.emit('newChatRoom', chatRoom);
        }

        res.status(200).json(chatRoom);
    } catch (error) {
        console.error('Error in createOrGetChatRoom:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสร้างห้องแชท' });
    }
};

// =============================================
// ส่งข้อความ
// =============================================
exports.sendMessage = async (req, res) => {
    try {
        const { message, image } = req.body;
        const { roomId } = req.params;
        const senderId = req.user.id;
        const senderRole = req.user.role;

        // ตรวจสอบว่าห้องแชทมีอยู่จริง
        const chatRoom = await ChatRoom.findByPk(roomId);
        if (!chatRoom) {
            return res.status(404).json({ message: 'ไม่พบห้องแชท' });
        }

        // ตรวจสอบสิทธิ์ (user ต้องเป็นเจ้าของห้อง หรือเป็น admin)
        if (senderRole !== 'admin' && chatRoom.userId !== senderId) {
            return res.status(403).json({ message: 'ไม่มีสิทธิ์ส่งข้อความในห้องนี้' });
        }

        // ถ้าเป็น admin ส่งข้อความครั้งแรก ให้ assign admin เข้าห้อง
        if (senderRole === 'admin' && !chatRoom.adminId) {
            await chatRoom.update({ adminId: senderId });
        }

        // ตรวจสอบว่าต้องมี message หรือ image อย่างน้อย 1 อย่าง
        if (!message && !image) {
            return res.status(400).json({ message: 'กรุณากรอกข้อความหรือแนบรูปภาพ' });
        }

        // อัพโหลดรูปภาพไป Cloudinary (ถ้ามี)
        let imageUrl = null;
        if (image) {
            try {
                const uploadResponse = await cloudinary.uploader.upload(image, {
                    folder: 'chat_images',
                    resource_type: 'image'
                });
                imageUrl = uploadResponse.secure_url;
            } catch (uploadError) {
                console.error('Error uploading image to Cloudinary:', uploadError);
                return res.status(400).json({ message: 'ไม่สามารถอัพโหลดรูปภาพได้' });
            }
        }

        // สร้างข้อความใหม่
        const newMessage = await ChatMessage.create({
            chatRoomId: parseInt(roomId),
            senderId,
            senderRole,
            message: message || null,
            image: imageUrl
        });

        // อัพเดท lastMessage ในห้องแชท
        await chatRoom.update({
            lastMessage: message || '📷 ส่งรูปภาพ',
            lastMessageAt: new Date()
        });

        // ดึงข้อมูลพร้อม sender info
        const messageWithSender = await ChatMessage.findByPk(newMessage.id, {
            include: [
                {
                    model: User,
                    as: 'sender',
                    attributes: ['id', 'firstName', 'lastName', 'profileImage', 'role']
                }
            ]
        });

        // ส่ง realtime ผ่าน Socket.IO ไปยังห้องแชท
        io.to(`room_${roomId}`).emit('newMessage', messageWithSender);

        // ถ้าผู้รับไม่ได้อยู่ในห้อง ส่ง notification ตรงไปหา
        const receiverId = senderRole === 'admin' ? chatRoom.userId : chatRoom.adminId;
        if (receiverId) {
            const receiverSocketId = getReceiverSocketId(receiverId.toString());
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('messageNotification', {
                    roomId: parseInt(roomId),
                    message: messageWithSender
                });
            }
        }

        res.status(201).json(messageWithSender);
    } catch (error) {
        console.error('Error in sendMessage:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการส่งข้อความ' });
    }
};

// =============================================
// ดึงข้อความทั้งหมดในห้องแชท
// =============================================
exports.getMessages = async (req, res) => {
    try {
        const { roomId } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        // ตรวจสอบว่าห้องแชทมีอยู่จริง
        const chatRoom = await ChatRoom.findByPk(roomId);
        if (!chatRoom) {
            return res.status(404).json({ message: 'ไม่พบห้องแชท' });
        }

        // ตรวจสอบสิทธิ์
        if (userRole !== 'admin' && chatRoom.userId !== userId) {
            return res.status(403).json({ message: 'ไม่มีสิทธิ์ดูข้อความในห้องนี้' });
        }

        const messages = await ChatMessage.findAll({
            where: { chatRoomId: roomId },
            include: [
                {
                    model: User,
                    as: 'sender',
                    attributes: ['id', 'firstName', 'lastName', 'profileImage', 'role']
                }
            ],
            order: [['createdAt', 'ASC']]
        });

        // อัพเดทสถานะ "อ่านแล้ว" สำหรับข้อความที่ไม่ใช่ของตัวเอง
        await ChatMessage.update(
            { isRead: true },
            {
                where: {
                    chatRoomId: roomId,
                    senderId: { [Op.ne]: userId },
                    isRead: false
                }
            }
        );

        res.status(200).json(messages);
    } catch (error) {
        console.error('Error in getMessages:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อความ' });
    }
};

// =============================================
// USER: ดึงห้องแชทของตัวเอง
// =============================================
exports.getMyChatRooms = async (req, res) => {
    try {
        const userId = req.user.id;

        const chatRooms = await ChatRoom.findAll({
            where: { userId },
            include: [
                {
                    model: User,
                    as: 'chatAdmin',
                    attributes: ['id', 'firstName', 'lastName', 'profileImage']
                }
            ],
            order: [['lastMessageAt', 'DESC']]
        });

        res.status(200).json(chatRooms);
    } catch (error) {
        console.error('Error in getMyChatRooms:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงห้องแชท' });
    }
};

// =============================================
// ADMIN: ดึงห้องแชททั้งหมด
// =============================================
exports.getAllChatRooms = async (req, res) => {
    try {
        const { status } = req.query; // filter by status: open, closed

        const whereClause = {};
        if (status) {
            whereClause.status = status;
        }

        const chatRooms = await ChatRoom.findAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'chatUser',
                    attributes: ['id', 'firstName', 'lastName', 'email', 'profileImage']
                },
                {
                    model: User,
                    as: 'chatAdmin',
                    attributes: ['id', 'firstName', 'lastName', 'profileImage']
                }
            ],
            order: [['lastMessageAt', 'DESC']]
        });

        // นับจำนวนข้อความที่ยังไม่ได้อ่านสำหรับแต่ละห้อง
        const roomsWithUnread = await Promise.all(
            chatRooms.map(async (room) => {
                const unreadCount = await ChatMessage.count({
                    where: {
                        chatRoomId: room.id,
                        senderRole: 'user',
                        isRead: false
                    }
                });
                return {
                    ...room.toJSON(),
                    unreadCount
                };
            })
        );

        res.status(200).json(roomsWithUnread);
    } catch (error) {
        console.error('Error in getAllChatRooms:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงห้องแชท' });
    }
};

// =============================================
// ADMIN: ปิดห้องแชท
// =============================================
exports.closeChatRoom = async (req, res) => {
    try {
        const { roomId } = req.params;

        const chatRoom = await ChatRoom.findByPk(roomId);
        if (!chatRoom) {
            return res.status(404).json({ message: 'ไม่พบห้องแชท' });
        }

        await chatRoom.update({ status: 'closed' });

        // แจ้ง user ว่าห้องแชทถูกปิด
        io.to(`room_${roomId}`).emit('roomClosed', { roomId: parseInt(roomId) });

        // แจ้งผ่าน direct socket ด้วย
        const userSocketId = getReceiverSocketId(chatRoom.userId.toString());
        if (userSocketId) {
            io.to(userSocketId).emit('roomClosed', { roomId: parseInt(roomId) });
        }

        res.status(200).json({ message: 'ปิดห้องแชทเรียบร้อย' });
    } catch (error) {
        console.error('Error in closeChatRoom:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการปิดห้องแชท' });
    }
};

// =============================================
// นับข้อความที่ยังไม่ได้อ่าน (สำหรับ badge notification)
// =============================================
exports.getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;

        let unreadCount;

        if (userRole === 'admin') {
            // Admin: นับข้อความจาก user ที่ยังไม่ได้อ่าน
            unreadCount = await ChatMessage.count({
                where: {
                    senderRole: 'user',
                    isRead: false
                },
                include: [
                    {
                        model: ChatRoom,
                        as: 'chatRoom',
                        where: {
                            status: 'open',
                            [Op.or]: [
                                { adminId: userId },
                                { adminId: null }
                            ]
                        }
                    }
                ]
            });
        } else {
            // User: นับข้อความจาก admin ที่ยังไม่ได้อ่าน
            unreadCount = await ChatMessage.count({
                where: {
                    senderRole: 'admin',
                    isRead: false
                },
                include: [
                    {
                        model: ChatRoom,
                        as: 'chatRoom',
                        where: {
                            userId: userId,
                            status: 'open'
                        }
                    }
                ]
            });
        }

        res.status(200).json({ unreadCount });
    } catch (error) {
        console.error('Error in getUnreadCount:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
};
