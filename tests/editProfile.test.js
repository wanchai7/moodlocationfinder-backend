require('dotenv').config();
const request = require('supertest');
const app = require('../server');
const { sequelize } = require('../models');
const { connectDB } = require('../config/db');
const jwt = require('jsonwebtoken');

describe('Edit Profile API (UC10 - Edit Profile Security & Update Check)', () => {
    let authToken;       // Token ของผู้ใช้ที่ถูกต้อง
    let mockUserId = 55; // ไอดีผู้ใช้จำลองสำหรับเคสนี้

    beforeAll(async () => {
        await connectDB();
        // เปิด SQL logging เพื่อแอบดูฟิลด์ที่ระบบหลังบ้านใช้อัปเดตจริง
        sequelize.options.logging = console.log; 
        await sequelize.sync({ force: true });

        // จำลองสร้างบัญชีผู้ใช้เตรียมไว้ในระบบ
        if (sequelize.models.User) {
            await sequelize.models.User.create({
                id: mockUserId,
                firstName: 'OldName',
                lastName: 'OldLastName',
                email: 'nichapha.edit@example.com',
                password: 'password123',
                gender: 'female',
                role: 'user',
                isVerified: true
            });

            // ปั๊ม JWT Token สิทธิ์ของผู้ใช้คนนี้ออกมาใช้งาน
            const jwtSecret = process.env.JWT_SECRET || 'your-default-secret';
            authToken = jwt.sign({ id: mockUserId, role: 'user' }, jwtSecret, { expiresIn: '1d' });
        }

        console.log('🛸 [Test Setup] Mock User and JWT Token for UC10 are ready.');
    });

    afterAll(async () => {
        if (sequelize) {
            await sequelize.close();
            console.log('🔌 [Test Teardown] Database connection closed.');
        }
    });

    // =========================================================================
    // เคสที่ 1: ผ่านฉลุยเมื่อมี Token ถูกต้อง
    // =========================================================================
    it('ควรแก้ไขข้อมูลโปรไฟล์สำเร็จ เมื่อส่ง Token ที่ถูกต้องแนบไปด้วย', async () => {
        expect(authToken).toBeDefined();

        // ข้อมูลใหม่ที่เราต้องการจะอัปเดต (เปลี่ยนชื่อ-นามสกุล)
        const updatedData = {
            firstName: 'Nichapha',
            lastName: 'NewLook'
        };

        // ยิงคำขออัปเดตข้อมูลด้วยการใช้ PUT หรือ PATCH (ขึ้นอยู่กับหลังบ้านคุณ ส่วนใหญ่ใช้ PUT)
        const response = await request(app)
            .put('/api/v1/users/profile') // 👈 พาร์ทสำหรับอัปเดตโปรไฟล์ของหลังบ้านคุณ (ถ้าเป็น /api/v1/auth/profile ให้เปลี่ยนตรงนี้ได้เลยค่ะ)
            .set('Authorization', `Bearer ${authToken}`)
            .send(updatedData);

        // 1. ระบบหลังบ้านต้องตอบกลับมาสำเร็จ (200 OK)
        expect(response.statusCode).toBe(200);
        console.log('📦 ผลลัพธ์อัปเดตจากหลังบ้าน:', response.body);

        // 2. ดึงข้อมูลผู้ใช้จากฐานข้อมูลขึ้นมาเช็คตรง ๆ ว่าเปลี่ยนไปจริงไหม
        if (sequelize.models.User) {
            const userInDB = await sequelize.models.User.findByPk(mockUserId);
            expect(userInDB.firstName).toBe('Nichapha');
            expect(userInDB.lastName).toBe('NewLook');
            console.log('✅ ยืนยันใน DB: ข้อมูลโปรไฟล์ถูกอัปเดตเรียบร้อยจริง!');
        }
    });

    // =========================================================================
    // เคสที่ 2: ต้องโดนบล็อกหากไม่มีสิทธิ์ (Security Check)
    // =========================================================================
    it('ระบบต้องปฏิเสธการแก้ไขข้อมูลโปรไฟล์ (401) หากไม่มีการแนบ Token', async () => {
        const response = await request(app)
            .put('/api/v1/users/profile')
            .send({
                firstName: 'HackerName'
            });

        // ระบบความปลอดภัยที่ดีต้องตีกลับด้วยรหัส 401 Unauthorized เท่านั้น ห้ามให้แก้เด็ดขาด
        expect(response.statusCode).toBe(401);
        console.log('🔒 ความปลอดภัยทำงานปกติ: ระบบบล็อกคนไม่มี Token สำเร็จ (401)');
    });
});