const express = require('express');
const router = express.Router();
const { sendContact, getAllContacts, updateContactStatus } = require('../controllers/contactController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// UC11: ส่งข้อความติดต่อ (ต้อง login)
router.post('/', protect, sendContact);

// Admin: ดูรายการข้อความทั้งหมด
router.get('/', protect, adminOnly, getAllContacts);

// Admin: อัปเดตสถานะ
router.put('/:id', protect, adminOnly, updateContactStatus);

module.exports = router;
