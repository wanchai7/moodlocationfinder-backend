const { User } = require('../models');
const path = require('path');
const fs = require('fs');
const cloudinary = require('../config/cloudinary');

// ========== แก้ไขโปรไฟล์ ==========
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
            // อัปโหลดไฟล์ไปยัง Cloudinary
            const uploadResponse = await cloudinary.uploader.upload(req.file.path, {
                folder: 'profile_images',
                resource_type: 'image'
            });

            // ลบรูปเก่า (ถ้ามี)
            if (user.profileImage) {
                if (user.profileImage.includes('cloudinary.com')) {
                    // ถ้าเป็นรูปบน Cloudinary พยายามลบรูปเก่าออกเพื่อไม่ให้รก
                    try {
                        const urlParts = user.profileImage.split('/');
                        const fileName = urlParts[urlParts.length - 1];
                        const publicId = `profile_images/${fileName.split('.')[0]}`;
                        await cloudinary.uploader.destroy(publicId);
                    } catch (err) {
                        console.error('Error deleting old image from Cloudinary:', err);
                    }
                } else {
                    // ถ้ายังเป็นรูปบน Local
                    const oldPath = path.join(__dirname, '..', user.profileImage);
                    if (fs.existsSync(oldPath)) {
                        fs.unlinkSync(oldPath);
                    }
                }
            }

            // ใช้ URL จาก Cloudinary
            user.profileImage = uploadResponse.secure_url;

            // ลบไฟล์ชั่วคราวใน Local (uploads/...)
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
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
