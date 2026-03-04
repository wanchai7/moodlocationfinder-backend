const { Contact } = require('../models');

// ========== UC11: ติดต่อ ==========
// POST /api/contact
const sendContact = async (req, res) => {
    try {
        const { subject, message } = req.body;

        if (!subject || !message) {
            return res.status(400).json({ message: 'กรุณากรอกหัวข้อและรายละเอียด' });
        }

        const contact = await Contact.create({
            userId: req.user.id,
            name: `${req.user.firstName} ${req.user.lastName}`,
            email: req.user.email,
            subject,
            message
        });

        res.status(201).json({
            message: 'เราได้รับข้อความของคุณแล้ว จะตอบกลับภายใน 24 ชั่วโมง',
            contact
        });
    } catch (error) {
        if (error.name === 'SequelizeValidationError') {
            const messages = error.errors.map(e => e.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        console.error('SendContact error:', error);
        res.status(500).json({
            message: 'ขออภัย ระบบขัดข้องชั่วคราว',
            fallback: 'คุณสามารถติดต่อเราผ่าน Email โดยตรงที่ support@moodplace.com'
        });
    }
};

// ========== ดึงรายการข้อความติดต่อ (Admin) ==========
// GET /api/contact
const getAllContacts = async (req, res) => {
    try {
        const contacts = await Contact.findAll({
            order: [['createdAt', 'DESC']]
        });

        res.json({
            count: contacts.length,
            contacts
        });
    } catch (error) {
        console.error('GetAllContacts error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
    }
};

// ========== อัปเดตสถานะ Contact (Admin) ==========
// PUT /api/contact/:id
const updateContactStatus = async (req, res) => {
    try {
        const contact = await Contact.findByPk(req.params.id);
        if (!contact) {
            return res.status(404).json({ message: 'ไม่พบข้อความ' });
        }

        contact.status = req.body.status || 'replied';
        await contact.save();

        res.json({
            message: 'อัปเดตสถานะเรียบร้อยแล้ว',
            contact
        });
    } catch (error) {
        console.error('UpdateContactStatus error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
    }
};

module.exports = { sendContact, getAllContacts, updateContactStatus };
