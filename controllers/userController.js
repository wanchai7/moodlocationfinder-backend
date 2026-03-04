const { User } = require('../models');
const path = require('path');
const fs = require('fs');

// ========== UC10: แก้ไขโปรไฟล์ ==========
// PUT /api/users/profile
const updateProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });
        }

        const { firstName, lastName, gender } = req.body;

        // อัปเดตข้อมูล
        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (gender) user.gender = gender;

        // อัปเดตรูปโปรไฟล์
        if (req.file) {
            // ลบรูปเก่า (ถ้ามี)
            if (user.profileImage) {
                const oldPath = path.join(__dirname, '..', user.profileImage);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }
            user.profileImage = `/uploads/${req.file.filename}`;
        }

        await user.save();

        res.json({
            message: 'อัปเดตโปรไฟล์สำเร็จ',
            user
        });
    } catch (error) {
        if (error.name === 'SequelizeValidationError') {
            const messages = error.errors.map(e => e.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        console.error('UpdateProfile error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
    }
};

// ========== เปลี่ยนรหัสผ่าน ==========
// PUT /api/users/change-password
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' });
        }

        const user = await User.findByPk(req.user.id);
        const isMatch = await user.matchPassword(currentPassword);

        if (!isMatch) {
            return res.status(401).json({ message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
        }

        user.password = newPassword;
        await user.save();

        res.json({ message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
    } catch (error) {
        console.error('ChangePassword error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
    }
};

module.exports = { updateProfile, changePassword };
