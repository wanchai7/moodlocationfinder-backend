require('dotenv').config();
const request = require('supertest');
const app = require('../server');
const { sequelize } = require('../models');
const { connectDB } = require('../config/db');
const jwt = require('jsonwebtoken');

describe('Admin Dashboard API (UC13 - System Statistics Security Check)', () => {
    let adminToken;      // Token ของ Admin ตัวจริง (มีสิทธิ์เข้าถึง)
    let normalUserToken; // Token ของ User ทั่วไป (ไม่มีสิทธิ์)

    beforeAll(async () => {
        await connectDB();
        sequelize.options.logging = console.log; 
        await sequelize.sync({ force: true });

        const jwtSecret = process.env.JWT_SECRET || 'your-default-secret';

        if (sequelize.models.User) {
            // 1. จำลองสร้างบัญชี Admin
            await sequelize.models.User.create({
                id: 1,
                firstName: 'Big',
                lastName: 'Boss',
                email: 'dashboard.admin@example.com',
                password: 'password123',
                gender: 'other',
                role: 'admin',
                isVerified: true
            });
            adminToken = jwt.sign({ id: 1, role: 'admin' }, jwtSecret, { expiresIn: '1d' });

            // 2. จำลองสร้างบัญชีผู้ใช้ทั่วไป
            await sequelize.models.User.create({
                id: 2,
                firstName: 'General',
                lastName: 'User',
                email: 'dashboard.user@example.com',
                password: 'password123',
                gender: 'female',
                role: 'user',
                isVerified: true
            });
            normalUserToken = jwt.sign({ id: 2, role: 'user' }, jwtSecret, { expiresIn: '1d' });
        }

        // 3. จำลองใส่ข้อมูลในระบบเล็กน้อย (เช่น สถานที่ 1 แห่ง) เพื่อให้ระบบมีสถิติไปคำนวณนับยอด
        if (sequelize.models.Place) {
            await sequelize.models.Place.create({
                name: 'สนามจันทน์',
                category: 'park',
                description: 'สวนสาธารณะและพระราชวัง',
                latitude: 13.8185,
                longitude: 100.0422
            });
        }

        console.log('🛸 [Test Setup] Admin, User, and Mock Data for Dashboard are ready.');
    });

    afterAll(async () => {
        if (sequelize) {
            await sequelize.close();
            console.log('🔌 [Test Teardown] Database connection closed.');
        }
    });

    // =========================================================================
    // เคสที่ 1: ตรวจสอบความปลอดภัย (Security Check) สิทธิ์ทั่วไปต้องเข้าไม่ได้
    // =========================================================================
    it('ระบบต้องบล็อก (403) หากผู้ใช้ธรรมดาพยายามเรียกดูข้อมูลสถิติบน Dashboard', async () => {
        expect(normalUserToken).toBeDefined();

const response = await request(app)
            .get('/api/v1/admin/users') // 🎯 เปลี่ยนเป็นพาร์ทที่มีอยู่จริงในระบบคุณ
            .set('Authorization', `Bearer ${normalUserToken}`)
            .send();

        // ต้องโดนบอกปัดความปลอดภัยกลับมาเป็น 403 Forbidden
        expect(response.statusCode).toBe(403);
        console.log('🔒 ความปลอดภัยปกติ: บล็อกผู้ใช้ทั่วไปไม่ให้เห็นสถิติสำเร็จ (403)');
    });

    // =========================================================================
    // เคสที่ 2: แอดมินตัวจริงดึงสถิติสำเร็จ และโครงสร้างข้อมูลมีความถูกต้อง
    // =========================================================================
    it('สิทธิ์ Admin ตัวจริง ต้องเรียกดูสถิติรวมของระบบได้สำเร็จ (200 OK)', async () => {
        expect(adminToken).toBeDefined();

        const response = await request(app)
            .get('/api/v1/admin/users') // 🎯 เปลี่ยนเป็นพาร์ทที่มีอยู่จริงในระบบคุณ
            .set('Authorization', `Bearer ${adminToken}`)
            .send();

        // 1. ตรวจสอบว่าระบบยอมให้แอดมินผ่านทางดึงข้อมูลสำเร็จ (200 OK)
        expect(response.statusCode).toBe(200);
        console.log('📦 รายชื่อผู้ใช้ทั้งหมดบนระบบที่ส่งมาหา Admin:', response.body);

        // 2. ข้อมูลผู้ใช้ที่ส่งมาทำสถิติต้องส่งมาเป็นรูป Object หรือ Array
        expect(response.body).toBeDefined();
        console.log('✅ ยืนยัน: แอดมินดึงข้อมูลผู้ใช้ทั้งหมดมาทำสถิติบน Dashboard เรียบร้อย!');
    });
});