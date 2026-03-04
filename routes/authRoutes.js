const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// UC1: สมัครสมาชิก
router.post('/register', register);

// UC2: เข้าสู่ระบบ
router.post('/login', login);

// ดึงข้อมูลผู้ใช้ปัจจุบัน
router.get('/me', protect, getMe);

module.exports = router;
