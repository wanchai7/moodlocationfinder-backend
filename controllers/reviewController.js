const { Review, Place, User } = require('../models');

// ========== UC7: เขียนรีวิวสถานที่ ==========
// POST /api/reviews
const createReview = async (req, res) => {
    try {
        const { placeId, rating, comment } = req.body;

        // ตรวจสอบข้อมูล
        if (!placeId || !rating) {
            return res.status(400).json({ message: 'กรุณาให้คะแนนด้วยค่ะ' });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'คะแนนต้องอยู่ระหว่าง 1-5 ดาว' });
        }

        // ตรวจสอบว่าสถานที่มีอยู่
        const place = await Place.findByPk(placeId);
        if (!place) {
            return res.status(404).json({ message: 'ไม่พบสถานที่' });
        }

        // ตรวจสอบว่าเคยรีวิวแล้วหรือยัง
        const existingReview = await Review.findOne({
            where: { userId: req.user.id, placeId }
        });

        if (existingReview) {
            // อัปเดตรีวิวเดิม
            existingReview.rating = rating;
            existingReview.comment = comment || existingReview.comment;
            await existingReview.save();

            return res.json({
                message: 'อัปเดตรีวิวเรียบร้อยแล้ว',
                review: existingReview
            });
        }

        // สร้างรีวิวใหม่
        const review = await Review.create({
            userId: req.user.id,
            placeId,
            rating,
            comment
        });

        res.status(201).json({
            message: 'ขอบคุณสำหรับการรีวิวของคุณ!',
            review
        });
    } catch (error) {
        if (error.name === 'SequelizeValidationError') {
            const messages = error.errors.map(e => e.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        console.error('CreateReview error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
    }
};

// ========== ดึงรีวิวของสถานที่ ==========
// GET /api/reviews/place/:placeId
const getReviewsByPlace = async (req, res) => {
    try {
        const { placeId } = req.params;

        const reviews = await Review.findAll({
            where: { placeId },
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'firstName', 'lastName', 'profileImage']
            }],
            order: [['createdAt', 'DESC']]
        });

        res.json({
            count: reviews.length,
            reviews
        });
    } catch (error) {
        console.error('GetReviewsByPlace error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
    }
};

// ========== ลบรีวิว ==========
// DELETE /api/reviews/:id
const deleteReview = async (req, res) => {
    try {
        const review = await Review.findByPk(req.params.id);

        if (!review) {
            return res.status(404).json({ message: 'ไม่พบรีวิว' });
        }

        // ตรวจสอบสิทธิ์ (เจ้าของหรือ admin)
        if (review.userId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'ไม่มีสิทธิ์ลบรีวิวนี้' });
        }

        await review.destroy();
        res.json({ message: 'ลบรีวิวเรียบร้อยแล้ว' });
    } catch (error) {
        console.error('DeleteReview error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
    }
};

module.exports = { createReview, getReviewsByPlace, deleteReview };
