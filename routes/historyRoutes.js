const express = require('express');
const router = express.Router();
const { getHistory, addHistory, deleteHistory } = require('../controllers/historyController');
const { protect } = require('../middleware/authMiddleware');

// ทุก route ต้อง login
router.use(protect);

// UC9: ดูประวัติการเดินทาง
router.get('/', getHistory);

// บันทึกประวัติ (เช็คอิน)
router.post('/', addHistory);

// ลบประวัติ
router.delete('/:id', deleteHistory);

module.exports = router;
