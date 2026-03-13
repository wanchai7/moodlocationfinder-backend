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
    deleteUser
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const upload = require('../middleware/uploadMiddleware');

// ทุก route ต้อง login + เป็น admin
router.use(protect, adminOnly);

// ========== UC12: จัดการสถานที่ ==========
router.post('/places', upload.array('images', 5), createPlace);
router.put('/places/:id', upload.array('images', 5), updatePlace);
router.put('/places/:id/moods', updatePlaceMoods);
router.delete('/places/:id', deletePlace);

// ========== UC13: จัดการ User ==========
router.get('/users', getAllUsers);
router.put('/users/:id/ban', banUser);
router.put('/users/:id/unban', unbanUser);
router.put('/users/:id/suspend', suspendUser);
router.delete('/users/:id', deleteUser);

module.exports = router;
