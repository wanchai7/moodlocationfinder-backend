require('dotenv').config();
const request = require('supertest');
const app = require('../server');
const { sequelize } = require('../models');
const { connectDB } = require('../config/db');
const jwt = require('jsonwebtoken');

jest.setTimeout(15000);

describe('Register API (UC01 - Register & Verification Flow Complete Check)', () => {
    
    beforeAll(async () => {
        await connectDB();
        sequelize.options.logging = false;
        await sequelize.sync({ force: true });
        console.log('🛸 [Test Setup] Database cleared for Complete Registration Flow testing.');
    });

    afterAll(async () => {
        if (sequelize) {
            await sequelize.close();
            console.log('🔌 [Test Teardown] Database connection closed.');
        }
    });

    const mockUser = {
        firstName: 'Nichapha',
        lastName: 'Test',
        email: 'nichapha.verify@example.com',
        password: 'securepassword123',
        gender: 'female',
        role: 'user'
    };

    // =========================================================================
    // เคสที่ 1: สมัครสมาชิกสำเร็จ (รอการยืนยันอีเมล)
    // =========================================================================
    it('ควรสมัครสมาชิกสำเร็จและคืนค่าสถานะ 200 เพื่อส่งลิงก์ยืนยันตัวตนตัวไปที่อีเมล', async () => {
        const response = await request(app)
            .post('/api/v1/auth/register')
            .send(mockUser);

        expect(response.statusCode).toBe(200); 
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('ระบบได้ส่งลิงก์ยืนยันไปที่อีเมลของคุณแล้ว');
        console.log('📦 ผลลัพธ์สมัครรอบแรกสำเร็จ (ระบบส่งลิงก์เรียบร้อย):', response.body.message);
    });

    // =========================================================================
    // เคสที่ 2: สมัครสมาชิกไม่ผ่าน เมื่ออีเมลนั้นได้ทำการ "ยืนยันตัวตนสำเร็จแล้ว"
    // =========================================================================
    it('ควรปฏิเสธการสมัครสมาชิกด้วยรหัส 400 เมื่ออีเมลนี้เคยผ่านกระบวนการยืนยันตัวตนเสร็จสมบูรณ์แล้ว', async () => {
        // 💡 จำลองสถานการณ์จริง: บันทึกข้อมูลคนนี้ลง Database เหมือนกับว่าเขาได้ไปกดลิงก์ยืนยันตัวตนเรียบร้อยแล้ว
        if (sequelize.models.User) {
            await sequelize.models.User.create({
                firstName: mockUser.firstName,
                lastName: mockUser.lastName,
                email: mockUser.email,
                password: mockUser.password, // ในระบบจริงจะถูกแฮช แต่เทสจำลองขอเซ็ตไว้ก่อนเพื่อดูเงื่อนไขอีเมลซ้ำ
                gender: mockUser.gender,
                role: 'user',
                status: 'active'
            });
            console.log('✨ [Mock System] จำลองสถานการณ์: บัญชีอีเมลนี้ถูกเปิดใช้งานเสร็จสมบูรณ์แล้วใน DB');
        }

        // ลองพยายามส่งข้อมูลสมัครสมาชิกซ้ำด้วยอีเมลเดิมเข้าเป็นรอบที่สอง
        const response = await request(app)
            .post('/api/v1/auth/register')
            .send(mockUser);

        // ดักผลลัพธ์: รอบนี้หลังบ้านต้องเช็คเจอ `existingUser` ในบรรทัดที่ 40 ของคอนโทรลเลอร์คุณ และดีดกลับด้วย 400 Bad Request
        console.log('🚨 สเตตัสจริงที่ตอบรับกลับมาจากการสมัครซ้ำ:', response.statusCode);
        console.log('📦 ข้อความแจ้งเตือนข้อผิดพลาดจากหลังบ้าน:', response.body.message);

        expect(response.statusCode).toBe(400); 
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toBe('อีเมลนี้ถูกใช้งานแล้ว');
    });
});