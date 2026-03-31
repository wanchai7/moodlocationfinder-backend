const express = require('express');
const router = express.Router();
const { register, login, getMe, registerAdmin, logout, verifyEmail, forgotPassword, getResetPasswordPage, resetPassword } = require('../controllers/authController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// UC1: สมัครสมาชิก (ส่งอีเมลยืนยัน)
router.post('/register', register);

// ยืนยันอีเมลจากการสมัครสมาชิก
router.post('/verify-email', verifyEmail);
router.get('/verify-email/:token', verifyEmail);

// UC2: เข้าสู่ระบบ
router.post('/login', login);

// ดึงข้อมูลผู้ใช้ปัจจุบัน
router.get('/me', protect, getMe);

// สร้าง Admin (สำหรับ Postman - ไม่ต้อง login)
router.post('/register-admin', registerAdmin);

// ออกจากระบบ
router.post('/logout', protect, logout);

// ลืมรหัสผ่าน
router.post('/forgot-password', forgotPassword);
router.get('/reset-password/:token', getResetPasswordPage);
router.post('/reset-password/:token', resetPassword);

module.exports = router;
