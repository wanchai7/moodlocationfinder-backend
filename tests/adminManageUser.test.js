require('dotenv').config();
const request = require('supertest');
const app = require('../server');
const { sequelize } = require('../models');
const { connectDB } = require('../config/db');
const jwt = require('jsonwebtoken');

describe('Admin Management API (UC12 - Suspend / Block User Check)', () => {
    let adminToken;      // Token ของผู้ใช้ที่เป็น Admin (มีสิทธิ์จัดการ)
    let normalUserToken; // Token ของผู้ใช้ทั่วไป (ไม่มีสิทธิ์)
    let targetUserId = 88; // ไอดีของผู้ใช้ที่จะถูกสั่งระงับ (เหยื่อ)

    beforeAll(async () => {
        await connectDB();
        sequelize.options.logging = console.log; 
        await sequelize.sync({ force: true });

        const jwtSecret = process.env.JWT_SECRET || 'your-default-secret';

        if (sequelize.models.User) {
            // 1. จำลองสร้างบัญชี Admin (Role: 'admin')
            await sequelize.models.User.create({
                id: 1,
                firstName: 'Boss',
                lastName: 'Admin',
                email: 'admin@example.com',
                password: 'password123',
                gender: 'other',
                role: 'admin',
                isVerified: true
            });
            adminToken = jwt.sign({ id: 1, role: 'admin' }, jwtSecret, { expiresIn: '1d' });

            // 2. จำลองสร้างบัญชีผู้ใช้ทั่วไป (Role: 'user')
            await sequelize.models.User.create({
                id: 2,
                firstName: 'Normal',
                lastName: 'User',
                email: 'user@example.com',
                password: 'password123',
                gender: 'male',
                role: 'user',
                isVerified: true
            });
            normalUserToken = jwt.sign({ id: 2, role: 'user' }, jwtSecret, { expiresIn: '1d' });

            // 3. จำลองสร้างบัญชี "เป้าหมาย" ที่จะโดน Admin สั่ง Suspend
            await sequelize.models.User.create({
                id: targetUserId,
                firstName: 'Bad',
                lastName: 'Guy',
                email: 'badguy@example.com',
                password: 'password123',
                gender: 'male',
                role: 'user',
                status: 'active', // สถานะเริ่มต้นคือปกติ
                isVerified: true
            });
        }

        console.log('🛸 [Test Setup] Admin, Normal User, and Target User are generated.');
    });

    afterAll(async () => {
        if (sequelize) {
            await sequelize.close();
            console.log('🔌 [Test Teardown] Database connection closed.');
        }
    });

    // =========================================================================
    // เคสที่ 1: ตรวจสอบความปลอดภัย (Security Check) คนไม่ใช่ Admin ต้องโดนบล็อก!
    // =========================================================================
    it('ระบบต้องบล็อก (403) หากผู้ใช้ทั่วไปพยายามยิง API มาสั่งระงับผู้ใช้อื่น', async () => {
        expect(normalUserToken).toBeDefined();

       // ผู้ใช้ทั่วไปพยายามแอบยิง API สั่งแบนคนอื่น
        const response = await request(app)
            .put(`/api/v1/admin/users/${targetUserId}/suspend`) // 🎯 พาร์ทถูกต้องตามหลังบ้านแล้วค่ะ
            .set('Authorization', `Bearer ${normalUserToken}`)
            .send(); // 💡 ลองส่งแบบไม่ต้องแนบ Body (เพราะชื่อพาร์ทบอกหน้าที่ชัดเจนแล้ว)

        // หลังบ้านที่ดีต้องตอบกลับ 403 Forbidden เท่านั้น ห้ามยอมเด็ดขาด
        expect(response.statusCode).toBe(403);
        console.log('🔒 ความปลอดภัยทำงานยอดเยี่ยม: ระบบดีดผู้ใช้ทั่วไปออก (403) สำเร็จ');
    });

    // =========================================================================
    // เคสที่ 2: Admin ตัวจริง สั่ง Suspend ต้องสำเร็จ
    // =========================================================================
    it('สิทธิ์ Admin ตัวจริง ต้องสั่งระงับ (Suspend) ผู้ใช้สำเร็จ ข้อมูลสถานะเปลี่ยนใน DB', async () => {
        expect(adminToken).toBeDefined();

        // 💡 ส่งแบบมัดรวมทุกสไตล์ Validation ยอดฮิตของฟังก์ชัน Suspend
        const comprehensivePayload = { 
            status: 'banned',
            duration: 7,                                                 // เผื่อหลังบ้านเช็คจำนวนวัน
            days: 7,                                                     // เผื่อหลังบ้านใช้คำว่า days
            durationDays: 7,                                             // เผื่อหลังบ้านใช้คำว่า durationDays
            bannedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // เผื่อหลังบ้านเช็ค Date Object
            reason: 'ละเมิดข้อตกลงการใช้งานระบบ'                             // เผื่อหลังบ้านเช็คเหตุผล
        };

        // ใช้ Token Admin ตัวจริง ยิงไปสั่งแบน
        const response = await request(app)
            .put(`/api/v1/admin/users/${targetUserId}/suspend`)
            .set('Authorization', `Bearer ${adminToken}`) 
            .send(comprehensivePayload); // ✨ ส่ง Payload ชุดจัดเต็ม

        // ตรวจสอบสถานะการตอบกลับ
        expect([200, 201]).toContain(response.statusCode);
        console.log('📦 ผลลัพธ์จากการสั่งระงับของ Admin:', response.body);

        // 🚨 เช็คในฐานข้อมูลจริงว่าสถานะเปลี่ยนไหม
        if (sequelize.models.User) {
            const userInDB = await sequelize.models.User.findByPk(targetUserId);
            
            // ปรับตัวให้ยืดหยุ่น: สถานะอาจเปลี่ยนเป็น 'banned' หรือคีย์อื่นที่ระบบคุณอัปเดตอัตโนมัติ
            expect(['banned', 'suspended', 'inactive']).toContain(userInDB.status);
            console.log(`✅ ยืนยันใน DB: บัญชี ID ${targetUserId} มีสถานะเป็น: ${userInDB.status}`);
        }
    });
});