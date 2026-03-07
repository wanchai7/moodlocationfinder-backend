const express = require('express');
const router = express.Router();
const {
    createOrGetChatRoom,
    sendMessage,
    getMessages,
    getMyChatRooms,
    getAllChatRooms,
    closeChatRoom,
    getUnreadCount
} = require('../controllers/chatController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// ============ User Routes ============

// สร้างหรือดึงห้องแชทของ user (user ต้อง login)
router.post('/room', protect, createOrGetChatRoom);

// ดึงห้องแชทของ user ตัวเอง
router.get('/my-rooms', protect, getMyChatRooms);

// ============ Shared Routes (User & Admin) ============

// ส่งข้อความในห้องแชท
router.post('/room/:roomId/message', protect, sendMessage);

// ดึงข้อความทั้งหมดในห้องแชท
router.get('/room/:roomId/messages', protect, getMessages);

// นับข้อความที่ยังไม่ได้อ่าน
router.get('/unread-count', protect, getUnreadCount);

// ============ Admin Routes ============

// ดึงห้องแชททั้งหมด (Admin only)
router.get('/rooms', protect, adminOnly, getAllChatRooms);

// ปิดห้องแชท (Admin only)
router.patch('/room/:roomId/close', protect, adminOnly, closeChatRoom);

module.exports = router;
