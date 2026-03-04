const { Favorite, Place, Review } = require('../models');

// ========== UC8: บันทึกรายการโปรด (Toggle) ==========
// POST /api/favorites/toggle
const toggleFavorite = async (req, res) => {
    try {
        const { placeId } = req.body;

        if (!placeId) {
            return res.status(400).json({ message: 'กรุณาระบุสถานที่' });
        }

        // ตรวจสอบว่าสถานที่มีอยู่
        const place = await Place.findByPk(placeId);
        if (!place) {
            return res.status(404).json({ message: 'ไม่พบสถานที่' });
        }

        // ตรวจสอบว่ามีในรายการโปรดแล้วหรือยัง
        const existing = await Favorite.findOne({
            where: { userId: req.user.id, placeId }
        });

        if (existing) {
            // ลบออกจากรายการโปรด
            await existing.destroy();
            return res.json({
                message: 'นำออกจากรายการโปรดแล้ว',
                isFavorite: false
            });
        }

        // เพิ่มเข้ารายการโปรด
        await Favorite.create({
            userId: req.user.id,
            placeId
        });

        res.status(201).json({
            message: 'บันทึกในรายการโปรดเรียบร้อยแล้ว',
            isFavorite: true
        });
    } catch (error) {
        console.error('ToggleFavorite error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
    }
};

// ========== ดึงรายการโปรดของผู้ใช้ ==========
// GET /api/favorites
const getFavorites = async (req, res) => {
    try {
        const favorites = await Favorite.findAll({
            where: { userId: req.user.id },
            include: [{
                model: Place,
                as: 'place',
                include: [{
                    model: Review,
                    as: 'reviews',
                    attributes: ['rating']
                }]
            }],
            order: [['createdAt', 'DESC']]
        });

        const favoritesWithRating = favorites.map(fav => {
            const favData = fav.toJSON();
            if (favData.place && favData.place.reviews) {
                const ratings = favData.place.reviews.map(r => r.rating);
                favData.place.averageRating = ratings.length > 0
                    ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
                    : 0;
                favData.place.reviewCount = ratings.length;
                delete favData.place.reviews;
            }
            return favData;
        });

        res.json({
            count: favoritesWithRating.length,
            favorites: favoritesWithRating
        });
    } catch (error) {
        console.error('GetFavorites error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
    }
};

// ========== ตรวจสอบว่าเป็นรายการโปรดหรือไม่ ==========
// GET /api/favorites/check/:placeId
const checkFavorite = async (req, res) => {
    try {
        const favorite = await Favorite.findOne({
            where: { userId: req.user.id, placeId: req.params.placeId }
        });

        res.json({ isFavorite: !!favorite });
    } catch (error) {
        console.error('CheckFavorite error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
    }
};

module.exports = { toggleFavorite, getFavorites, checkFavorite };
