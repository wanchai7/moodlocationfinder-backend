const { Op } = require('sequelize');
const { User, Place, EmailLog } = require('../models');
const nodemailer = require('nodemailer');

// ========== UC12: จัดการสถานที่ให้เข้ากับอารมณ์ ==========

// สร้างสถานที่ใหม่ (Admin)
// POST /api/admin/places
const createPlace = async (req, res) => {
    try {
        const { name, description, category, moods, personality, images, address, latitude, longitude } = req.body;

        if (!name || !category) {
            return res.status(400).json({ message: 'กรุณากรอกชื่อและหมวดหมู่สถานที่' });
        }

        const place = await Place.create({
            name,
            description,
            category,
            moods: moods || [],
            personality: personality || [],
            images: images || [],
            address,
            latitude,
            longitude
        });

        res.status(201).json({
            message: 'เพิ่มสถานที่เรียบร้อยแล้ว',
            place
        });
    } catch (error) {
        if (error.name === 'SequelizeValidationError') {
            const messages = error.errors.map(e => e.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        console.error('CreatePlace error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
    }
};

// อัปเดต Mood Tags ของสถานที่
// PUT /api/admin/places/:id/moods
const updatePlaceMoods = async (req, res) => {
    try {
        const place = await Place.findByPk(req.params.id);
        if (!place) {
            return res.status(404).json({ message: 'ไม่พบสถานที่' });
        }

        const { moods, personality } = req.body;

        if (moods !== undefined) place.moods = moods;
        if (personality !== undefined) place.personality = personality;
        await place.save();

        res.json({
            message: 'อัปเดต Tag อารมณ์เรียบร้อยแล้ว',
            place
        });
    } catch (error) {
        console.error('UpdatePlaceMoods error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
    }
};

// อัปเดตข้อมูลสถานที่
// PUT /api/admin/places/:id
const updatePlace = async (req, res) => {
    try {
        const place = await Place.findByPk(req.params.id);
        if (!place) {
            return res.status(404).json({ message: 'ไม่พบสถานที่' });
        }

        const { name, description, category, moods, personality, images, address, latitude, longitude } = req.body;

        if (name) place.name = name;
        if (description !== undefined) place.description = description;
        if (category) place.category = category;
        if (moods) place.moods = moods;
        if (personality) place.personality = personality;
        if (images) place.images = images;
        if (address !== undefined) place.address = address;
        if (latitude !== undefined) place.latitude = latitude;
        if (longitude !== undefined) place.longitude = longitude;

        await place.save();

        res.json({
            message: 'อัปเดตสถานที่เรียบร้อยแล้ว',
            place
        });
    } catch (error) {
        console.error('UpdatePlace error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
    }
};

// ลบสถานที่
// DELETE /api/admin/places/:id
const deletePlace = async (req, res) => {
    try {
        const place = await Place.findByPk(req.params.id);
        if (!place) {
            return res.status(404).json({ message: 'ไม่พบสถานที่' });
        }

        await place.destroy();
        res.json({ message: 'ลบสถานที่เรียบร้อยแล้ว' });
    } catch (error) {
        console.error('DeletePlace error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
    }
};

// ========== UC13: การจัดการ User ==========

// ดึง User ทั้งหมด
// GET /api/admin/users
const getAllUsers = async (req, res) => {
    try {
        const { search, status } = req.query;

        let whereClause = {};

        if (search) {
            whereClause[Op.or] = [
                { firstName: { [Op.iLike]: `%${search}%` } },
                { lastName: { [Op.iLike]: `%${search}%` } },
                { email: { [Op.iLike]: `%${search}%` } }
            ];
        }

        if (status) {
            whereClause.status = status;
        }

        const users = await User.findAll({
            where: whereClause,
            order: [['createdAt', 'DESC']]
        });

        res.json({
            count: users.length,
            users
        });
    } catch (error) {
        console.error('GetAllUsers error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
    }
};

// แบน User
// PUT /api/admin/users/:id/ban
const banUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });
        }

        if (user.role === 'admin') {
            return res.status(400).json({ message: 'ไม่สามารถแบนผู้ดูแลระบบได้' });
        }

        user.status = 'banned';
        await user.save();

        res.json({
            message: 'ระงับการใช้งานเรียบร้อยแล้ว',
            user
        });
    } catch (error) {
        console.error('BanUser error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
    }
};

// ปลดแบน User
// PUT /api/admin/users/:id/unban
const unbanUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });
        }

        user.status = 'active';
        await user.save();

        res.json({
            message: 'เปิดใช้งานผู้ใช้เรียบร้อยแล้ว',
            user
        });
    } catch (error) {
        console.error('UnbanUser error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
    }
};

// ลบ User ถาวร
// DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
    try {
        const { confirmText } = req.body;

        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });
        }

        if (user.role === 'admin') {
            return res.status(400).json({ message: 'ไม่สามารถลบผู้ดูแลระบบได้' });
        }

        // ต้องพิมพ์ DELETE เพื่อยืนยัน
        if (confirmText !== 'DELETE') {
            return res.status(400).json({
                message: 'กรุณาพิมพ์ "DELETE" เพื่อยืนยันการลบถาวร'
            });
        }

        await user.destroy();
        res.json({ message: 'ลบผู้ใช้ออกจากระบบถาวรเรียบร้อยแล้ว' });
    } catch (error) {
        console.error('DeleteUser error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
    }
};

// ========== UC14: ส่งเมล ==========

// สร้าง Nodemailer Transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};

// Email Templates
const emailTemplates = {
    welcome: (userName) => ({
        subject: 'ยินดีต้อนรับสู่ Mood & Place! 🎉',
        html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border-radius: 12px;">
        <h1 style="color: #6366f1; text-align: center;">ยินดีต้อนรับ ${userName}! 🎉</h1>
        <p style="font-size: 16px; line-height: 1.6; color: #374151;">สวัสดีครับ/ค่ะ ${userName},</p>
        <p style="font-size: 16px; line-height: 1.6; color: #374151;">ขอบคุณที่สมัครสมาชิกกับ <strong>Mood & Place</strong> เราพร้อมช่วยคุณค้นหาสถานที่ที่ตรงกับอารมณ์ของคุณ!</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="#" style="background-color: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">เริ่มต้นใช้งาน</a>
        </div>
        <p style="font-size: 14px; color: #6b7280; text-align: center;">ทีมงาน Mood & Place</p>
      </div>
    `
    }),
    newsletter: (subject, content) => ({
        subject,
        html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border-radius: 12px;">
        <h1 style="color: #6366f1; text-align: center;">${subject}</h1>
        <div style="font-size: 16px; line-height: 1.6; color: #374151;">${content}</div>
        <p style="font-size: 14px; color: #6b7280; text-align: center; margin-top: 30px;">ทีมงาน Mood & Place</p>
      </div>
    `
    }),
    custom: (subject, body) => ({
        subject,
        html: body
    })
};

// ส่งอีเมล
// POST /api/admin/send-email
const sendEmail = async (req, res) => {
    try {
        const { recipientEmail, template, subject, body, customData } = req.body;

        if (!recipientEmail || !template) {
            return res.status(400).json({ message: 'กรุณาระบุอีเมลผู้รับและ Template' });
        }

        let emailContent;
        switch (template) {
            case 'welcome':
                emailContent = emailTemplates.welcome(customData?.userName || 'User');
                break;
            case 'newsletter':
                emailContent = emailTemplates.newsletter(subject, body);
                break;
            case 'custom':
                emailContent = emailTemplates.custom(subject, body);
                break;
            default:
                return res.status(400).json({
                    message: 'Template ไม่ถูกต้อง',
                    availableTemplates: ['welcome', 'newsletter', 'custom']
                });
        }

        const transporter = createTransporter();

        const mailOptions = {
            from: `"Mood & Place" <${process.env.EMAIL_USER}>`,
            to: recipientEmail,
            subject: emailContent.subject,
            html: emailContent.html
        };

        // ส่งแบบ Asynchronous
        try {
            await transporter.sendMail(mailOptions);

            // บันทึกประวัติ
            await EmailLog.create({
                recipientEmail,
                subject: emailContent.subject,
                body: emailContent.html,
                template,
                status: 'sent',
                sentBy: req.user.id
            });

            res.json({
                message: 'ส่งอีเมลเรียบร้อยแล้ว',
                status: 'sent'
            });
        } catch (mailError) {
            // บันทึกประวัติ error
            await EmailLog.create({
                recipientEmail,
                subject: emailContent.subject,
                body: emailContent.html,
                template,
                status: 'failed',
                errorMessage: mailError.message,
                sentBy: req.user.id
            });

            res.status(500).json({
                message: 'ส่งอีเมลไม่สำเร็จ',
                error: mailError.message,
                status: 'failed'
            });
        }
    } catch (error) {
        console.error('SendEmail error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
    }
};

// ดูประวัติการส่งเมล
// GET /api/admin/email-logs
const getEmailLogs = async (req, res) => {
    try {
        const logs = await EmailLog.findAll({
            include: [{
                model: User,
                as: 'sender',
                attributes: ['id', 'firstName', 'lastName']
            }],
            order: [['createdAt', 'DESC']]
        });

        res.json({
            count: logs.length,
            logs
        });
    } catch (error) {
        console.error('GetEmailLogs error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
    }
};

// ส่งเมลใหม่ (Resend)
// POST /api/admin/email-logs/:id/resend
const resendEmail = async (req, res) => {
    try {
        const log = await EmailLog.findByPk(req.params.id);
        if (!log) {
            return res.status(404).json({ message: 'ไม่พบประวัติการส่ง' });
        }

        const transporter = createTransporter();

        try {
            await transporter.sendMail({
                from: `"Mood & Place" <${process.env.EMAIL_USER}>`,
                to: log.recipientEmail,
                subject: log.subject,
                html: log.body
            });

            // บันทึกใหม่
            await EmailLog.create({
                recipientEmail: log.recipientEmail,
                subject: log.subject,
                body: log.body,
                template: log.template,
                status: 'sent',
                sentBy: req.user.id
            });

            res.json({ message: 'ส่งอีเมลใหม่เรียบร้อยแล้ว', status: 'sent' });
        } catch (mailError) {
            res.status(500).json({
                message: 'ส่งอีเมลใหม่ไม่สำเร็จ',
                error: mailError.message
            });
        }
    } catch (error) {
        console.error('ResendEmail error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
    }
};

module.exports = {
    createPlace,
    updatePlaceMoods,
    updatePlace,
    deletePlace,
    getAllUsers,
    banUser,
    unbanUser,
    deleteUser,
    sendEmail,
    getEmailLogs,
    resendEmail
};
