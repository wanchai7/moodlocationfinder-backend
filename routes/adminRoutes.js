const express = require('express');
const router = express.Router();
const {
    createPlace,
    updatePlaceMoods,
    updatePlace,
    deletePlace,
    getAllUsers,
    banUser,
    unbanUser,
    suspendUser,
    deleteUser,
    sendEmail,
    getEmailLogs,
    resendEmail
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// ทุก route ต้อง login + เป็น admin
router.use(protect, adminOnly);

// ========== UC12: จัดการสถานที่ ==========
router.post('/places', createPlace);
router.put('/places/:id', updatePlace);
router.put('/places/:id/moods', updatePlaceMoods);
router.delete('/places/:id', deletePlace);

// ========== UC13: จัดการ User ==========
router.get('/users', getAllUsers);
router.put('/users/:id/ban', banUser);
router.put('/users/:id/unban', unbanUser);
router.put('/users/:id/suspend', suspendUser);
router.delete('/users/:id', deleteUser);

// ========== UC14: ส่งเมล ==========
router.post('/send-email', sendEmail);
router.get('/email-logs', getEmailLogs);
router.post('/email-logs/:id/resend', resendEmail);

module.exports = router;
