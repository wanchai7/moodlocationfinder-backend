const express = require('express');
const router = express.Router();
const { createReview, getReviewsByPlace, deleteReview } = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

// UC7: เขียนรีวิว (ต้อง login)
router.post('/', protect, createReview);

// ดึงรีวิวของสถานที่ (ไม่ต้อง login)
router.get('/place/:placeId', getReviewsByPlace);

// ลบรีวิว (ต้อง login)
router.delete('/:id', protect, deleteReview);

module.exports = router;
