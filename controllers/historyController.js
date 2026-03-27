const { History, Place } = require('../models');

// ========== UC9: ดูประวัติการเดินทาง ==========
// GET /api/history
const getHistory = async (req, res) => {
    try {
        const histories = await History.findAll({
            where: { userId: req.user.id },
            include: [{
                model: Place,
                as: 'place',
                attributes: ['id', 'name', 'category', 'images', 'address']
            }],
            order: [['visitedAt', 'DESC']]
        });

        if (histories.length === 0) {
            return res.json({
                message: 'คุณยังไม่มีประวัติการเดินทาง เริ่มออกไปค้นหาสถานที่ตามอารมณ์ของคุณเลย!',
                count: 0,
                histories: []
            });
        }

        res.json({
            count: histories.length,
            histories
        });
    } catch (error) {
        console.error('GetHistory error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
    }
};

// ========== บันทึกประวัติการเดินทาง (เช็คอิน) ==========
// POST /api/history
const addHistory = async (req, res) => {
    try {
        const { placeId, name, image } = req.body;

        if (!placeId) {
            return res.status(400).json({ message: 'กรุณาระบุสถานที่' });
        }

        // บันทึกประวัติโดยใช้ placeId จาก Google ตรงๆ
        const history = await History.create({
            userId: req.user.id,
            placeId,
            placeName: name,
            placeImage: image,
            visitedAt: new Date()
        });

        res.status(201).json({
            message: 'บันทึกประวัติการเดินทางเรียบร้อยแล้ว',
            history
        });
    } catch (error) {
        console.error('AddHistory error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
    }
};

// ========== ลบประวัติ ==========
// DELETE /api/history/:id
const deleteHistory = async (req, res) => {
    try {
        const history = await History.findOne({
            where: { id: req.params.id, userId: req.user.id }
        });

        if (!history) {
            return res.status(404).json({ message: 'ไม่พบประวัติ' });
        }

        await history.destroy();
        res.json({ message: 'ลบประวัติเรียบร้อยแล้ว' });
    } catch (error) {
        console.error('DeleteHistory error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
    }
};

module.exports = { getHistory, addHistory, deleteHistory };
