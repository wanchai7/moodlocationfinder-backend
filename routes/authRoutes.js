const express = require('express');
const router = express.Router();
const { register, login, getMe, registerAdmin } = require('../controllers/authController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// UC1: สมัครสมาชิก
router.post('/register', register);

// UC2: เข้าสู่ระบบ
router.post('/login', login);

// ดึงข้อมูลผู้ใช้ปัจจุบัน
router.get('/me', protect, getMe);

// สร้าง Admin (สำหรับ Postman - ไม่ต้อง login)
router.post('/register-admin', registerAdmin);

module.exports = router;
