const { Op } = require('sequelize');
const { User, Place } = require('../models');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');

// ========== Helper: ดึงพิกัดจาก Google Maps URL ==========
const extractCoordsFromGoogleMaps = (url) => {
    if (!url || typeof url !== 'string') return null;

    try {
        // รูปแบบที่ 1: @lat,lng หรือ @lat,lng,zoom
        // เช่น https://www.google.com/maps/@13.7563,100.5018,15z
        // เช่น https://www.google.com/maps/place/.../@13.7563,100.5018,15z
        const atPattern = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
        const atMatch = url.match(atPattern);
        if (atMatch) {
            return { latitude: parseFloat(atMatch[1]), longitude: parseFloat(atMatch[2]) };
        }

        // รูปแบบที่ 2: ?q=lat,lng หรือ query=lat,lng
        // เช่น https://www.google.com/maps?q=13.7563,100.5018
        const queryPattern = /[?&](?:q|query)=(-?\d+\.\d+),(-?\d+\.\d+)/;
        const queryMatch = url.match(queryPattern);
        if (queryMatch) {
            return { latitude: parseFloat(queryMatch[1]), longitude: parseFloat(queryMatch[2]) };
        }

        // รูปแบบที่ 3: /dir/ หรือ !3d...!4d...
        // เช่น https://www.google.com/maps/dir//13.7563,100.5018
        const dirPattern = /\/dir\/\/(-?\d+\.\d+),(-?\d+\.\d+)/;
        const dirMatch = url.match(dirPattern);
        if (dirMatch) {
            return { latitude: parseFloat(dirMatch[1]), longitude: parseFloat(dirMatch[2]) };
        }

        // รูปแบบที่ 4: !3d (latitude) และ !4d (longitude)
        // เช่น ...!3d13.7563!4d100.5018...
        const dataPattern = /!3d(-?\d+\.\d+).*!4d(-?\d+\.\d+)/;
        const dataMatch = url.match(dataPattern);
        if (dataMatch) {
            return { latitude: parseFloat(dataMatch[1]), longitude: parseFloat(dataMatch[2]) };
        }

        // รูปแบบที่ 5: /place/lat,lng
        // เช่น https://www.google.com/maps/place/13.7563,100.5018
        const placeCoordPattern = /\/place\/(-?\d+\.\d+),(-?\d+\.\d+)/;
        const placeCoordMatch = url.match(placeCoordPattern);
        if (placeCoordMatch) {
            return { latitude: parseFloat(placeCoordMatch[1]), longitude: parseFloat(placeCoordMatch[2]) };
        }

        return null;
    } catch (error) {
        console.error('Error extracting coords from Google Maps URL:', error);
        return null;
    }
};

// ========== จัดการสถานที่ให้เข้ากับอารมณ์ ==========

// สร้างสถานที่ใหม่ (Admin)
// POST /api/admin/places
const createPlace = async (req, res) => {
    try {
        const { name, description, category, moods, personality, images, address, latitude, longitude, googleMapsUrl } = req.body;

        if (!name || !category) {
            return res.status(400).json({ message: 'กรุณากรอกชื่อและหมวดหมู่สถานที่' });
        }

        // ดึงพิกัดจาก Google Maps URL (ถ้ามี)
        let finalLatitude = latitude;
        let finalLongitude = longitude;

        if (googleMapsUrl) {
            const coords = extractCoordsFromGoogleMaps(googleMapsUrl);
            if (coords) {
                finalLatitude = coords.latitude;
                finalLongitude = coords.longitude;
            } else {
                return res.status(400).json({
                    message: 'ไม่สามารถดึงพิกัดจากลิงก์ Google Maps ได้ กรุณาตรวจสอบลิงก์อีกครั้ง',
                    hint: 'ลิงก์ควรเป็นรูปแบบ เช่น https://www.google.com/maps/place/.../@13.7563,100.5018,15z'
                });
            }
        }

        let parsedImages = [];
        if (images) {
            try { parsedImages = typeof images === 'string' ? JSON.parse(images) : images; } catch (e) { parsedImages = Array.isArray(images) ? images : [images]; }
        }
        let parsedMoods = [];
        if (moods) {
            try { parsedMoods = typeof moods === 'string' ? JSON.parse(moods) : moods; } catch (e) { parsedMoods = Array.isArray(moods) ? moods : [moods]; }
        }
        let parsedPersonality = [];
        if (personality) {
            try { parsedPersonality = typeof personality === 'string' ? JSON.parse(personality) : personality; } catch (e) { parsedPersonality = Array.isArray(personality) ? personality : [personality]; }
        }

        let uploadedImages = [];
        if (req.files && req.files.length > 0) {
            const bucketName = process.env.SUPABASE_BUCKET || 'uploads';
            for (const file of req.files) {
                // ใช้ชื่อไฟล์ที่แนบมา (แนบ timestamp เพื่อป้องกันชื่อไฟล์ซ้ำกัน)
                const originalName = file.originalname.replace(/\s+/g, '_');
                const fileName = `place_images/${Date.now()}_${originalName}`;
                const fileBuffer = file.buffer;
                
                const { data, error } = await supabase.storage
                    .from(bucketName)
                    .upload(fileName, fileBuffer, {
                        contentType: file.mimetype || 'image/jpeg',
                        upsert: true
                    });

                if (error) {
                    console.error("Supabase upload error:", error);
                } else {
                    const { data: urlData } = supabase.storage
                        .from(bucketName)
                        .getPublicUrl(fileName);
                    uploadedImages.push(urlData.publicUrl);
                }
            }
        }
        const finalImages = [...parsedImages, ...uploadedImages];

        const place = await Place.create({
            name,
            description,
            category,
            moods: parsedMoods,
            personality: parsedPersonality,
            images: finalImages,
            address,
            latitude: finalLatitude,
            longitude: finalLongitude,
            googleMapsUrl: googleMapsUrl || null
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

        const { name, description, category, moods, personality, images, address, latitude, longitude, googleMapsUrl } = req.body;

        let parsedImages = place.images || [];
        if (images !== undefined) {
            if (images === '') {
                parsedImages = [];
            } else {
                try { parsedImages = typeof images === 'string' ? JSON.parse(images) : images; } catch (e) { parsedImages = Array.isArray(images) ? images : [images]; }
            }
        }

        let uploadedImages = [];
        if (req.files && req.files.length > 0) {
            const bucketName = process.env.SUPABASE_BUCKET || 'uploads';
            for (const file of req.files) {
                // ใช้ชื่อไฟล์ที่แนบมา (แนบ timestamp เพื่อป้องกันชื่อไฟล์ซ้ำกัน)
                const originalName = file.originalname.replace(/\s+/g, '_');
                const fileName = `place_images/${Date.now()}_${originalName}`;
                const fileBuffer = file.buffer;
                
                const { data, error } = await supabase.storage
                    .from(bucketName)
                    .upload(fileName, fileBuffer, {
                        contentType: file.mimetype || 'image/jpeg',
                        upsert: true
                    });

                if (error) {
                    console.error("Supabase upload error:", error);
                } else {
                    const { data: urlData } = supabase.storage
                        .from(bucketName)
                        .getPublicUrl(fileName);
                    uploadedImages.push(urlData.publicUrl);
                }
            }
        }
        const finalImages = [...parsedImages, ...uploadedImages];

        if (name) place.name = name;
        if (description !== undefined) place.description = description;
        if (category) place.category = category;
        if (moods) {
            try { place.moods = typeof moods === 'string' ? JSON.parse(moods) : moods; } catch (e) { place.moods = Array.isArray(moods) ? moods : [moods]; }
        }
        if (personality) {
            try { place.personality = typeof personality === 'string' ? JSON.parse(personality) : personality; } catch (e) { place.personality = Array.isArray(personality) ? personality : [personality]; }
        }
        place.images = finalImages;
        if (address !== undefined) place.address = address;

        // ถ้าส่ง googleMapsUrl มา ให้ดึงพิกัดจากลิงก์
        if (googleMapsUrl) {
            const coords = extractCoordsFromGoogleMaps(googleMapsUrl);
            if (coords) {
                place.latitude = coords.latitude;
                place.longitude = coords.longitude;
                place.googleMapsUrl = googleMapsUrl;
            } else {
                return res.status(400).json({
                    message: 'ไม่สามารถดึงพิกัดจากลิงก์ Google Maps ได้ กรุณาตรวจสอบลิงก์อีกครั้ง',
                    hint: 'ลิงก์ควรเป็นรูปแบบ เช่น https://www.google.com/maps/place/.../@13.7563,100.5018,15z'
                });
            }
        } else {
            // ยังรองรับการส่ง lat/lng ตรงๆ เหมือนเดิม
            if (latitude !== undefined) place.latitude = latitude;
            if (longitude !== undefined) place.longitude = longitude;
        }

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

// ========== การจัดการ User ==========

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

// แบน User ถาวร
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
        user.bannedUntil = null;
        await user.save();

        res.json({
            message: 'ระงับการใช้งานถาวรเรียบร้อยแล้ว',
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
        user.bannedUntil = null;
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

// ระงับผู้ใช้ชั่วคราว
// PUT /api/admin/users/:id/suspend
const suspendUser = async (req, res) => {
    try {
        const { durationDays, durationHours, durationMinutes } = req.body;
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });
        }

        if (user.role === 'admin') {
            return res.status(400).json({ message: 'ไม่สามารถระงับผู้ดูแลระบบได้' });
        }

        let totalMs = 0;
        if (durationDays) totalMs += parseInt(durationDays) * 24 * 60 * 60 * 1000;
        if (durationHours) totalMs += parseInt(durationHours) * 60 * 60 * 1000;
        if (durationMinutes) totalMs += parseInt(durationMinutes) * 60 * 1000;

        if (totalMs === 0) {
            return res.status(400).json({ message: 'กรุณาระบุระยะเวลาที่ต้องการระงับอย่างน้อย 1 นาที' });
        }

        user.status = 'banned';
        user.bannedUntil = new Date(Date.now() + totalMs);
        await user.save();

        res.json({
            message: `ระงับการใช้งานชั่วคราวเรียบร้อยแล้ว จะปลดแบนในวันที่ ${user.bannedUntil.toLocaleString('th-TH')}`,
            user
        });
    } catch (error) {
        console.error('SuspendUser error:', error);
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

module.exports = {
    createPlace,
    updatePlaceMoods,
    updatePlace,
    deletePlace,
    getAllUsers,
    banUser,
    unbanUser,
    suspendUser,
    deleteUser
};
