require('dotenv').config();
const request = require('supertest');
const app = require('../server');
const { sequelize } = require('../models');
const { connectDB } = require('../config/db');
const jwt = require('jsonwebtoken');

describe('Travel History API (UC09 - Travel History Security Check)', () => {
    let userA_Token;       // Token ของผู้ใช้ A (คนที่ล็อกอินเข้ามาดึงข้อมูล)
    let userB_Token;       // Token ของผู้ใช้ B
    let samplePlaceId;     // ไอดีสถานที่ท่องเที่ยวจำลอง

    beforeAll(async () => {
        await connectDB();
        // สั่งพิมพ์คำสั่ง SQL ออกมาดูโครงสร้าง
        sequelize.options.logging = console.log; 
        await sequelize.sync({ force: true });

        // 1. จำลองสร้างข้อมูลสถานที่ท่องเที่ยวลงฐานข้อมูล
        if (sequelize.models.Place) {
            const place = await sequelize.models.Place.create({
                name: 'พระปฐมเจดีย์',
                category: 'temple',
                description: 'แลนด์มาร์คศักดิ์สิทธิ์ประจำจังหวัดนครปฐม',
                latitude: 13.8194,
                longitude: 100.0603
            });
            samplePlaceId = place.id;
        }

        // 2. จำลองสร้างบัญชีผู้ใช้ 2 คน (User A และ User B)
        if (sequelize.models.User) {
            // สร้าง User A (ID: 10)
            await sequelize.models.User.create({
                id: 10,
                firstName: 'UserA',
                lastName: 'Nichapha',
                email: 'usera@example.com',
                password: 'password123',
                gender: 'female',
                role: 'user',
                isVerified: true
            });

            // สร้าง User B (ID: 20)
            await sequelize.models.User.create({
                id: 20,
                firstName: 'UserB',
                lastName: 'Stranger',
                email: 'userb@example.com',
                password: 'password123',
                gender: 'male',
                role: 'user',
                isVerified: true
            });

            // ปั๊ม JWT Token ของทั้งคู่แยกกัน
            const jwtSecret = process.env.JWT_SECRET || 'your-default-secret';
            userA_Token = jwt.sign({ id: 10, role: 'user' }, jwtSecret, { expiresIn: '1d' });
            userB_Token = jwt.sign({ id: 20, role: 'user' }, jwtSecret, { expiresIn: '1d' });
        }

        // 3. ใส่ข้อมูลประวัติลงตาราง (ให้ User A มี 1 ประวัติ และ User B มี 1 ประวัติ)
        if (sequelize.models.History) {
            // ประวัติของ User A
            await sequelize.models.History.create({
                userId: 10,
                placeId: samplePlaceId,
                visitedAt: new Date()
            });

            // ประวัติของ User B
            await sequelize.models.History.create({
                userId: 20,
                placeId: samplePlaceId,
                visitedAt: new Date()
            });
        }

        console.log('🛸 [Test Setup] Mock Users and separated History records are ready.');
    });

    afterAll(async () => {
        if (sequelize) {
            await sequelize.close();
            console.log('🔌 [Test Teardown] Database connection closed.');
        }
    });

    // =========================================================================
    // เคสที่ 1: ตรวจสอบความถูกต้องและสิทธิ์ความเป็นเจ้าของข้อมูล
    // =========================================================================
    it('ผู้ใช้ที่ Login ต้องเรียกดูประวัติการเดินทางได้สำเร็จ และต้องเห็นเฉพาะของตัวเองเท่านั้น', async () => {
        expect(userA_Token).toBeDefined();

        // จำลองสถานการณ์: User A ล็อกอินแล้วส่งคำขอเรียกดูประวัติของตัวเองผ่าน API `GET`
        const response = await request(app)
            .get('/api/v1/history') // 👈 พาร์ทดึงประวัติของหลังบ้านคุณ
            .set('Authorization', `Bearer ${userA_Token}`)
            .send();

        // 1. ระบบหลังบ้านต้องตอบกลับมาสำเร็จ (200 OK)
        expect(response.statusCode).toBe(200);

        // 💡 เติมสิ่งนี้: ลองพิมพ์ดูว่าหน้าตา Object ที่หลังบ้านส่งมาจริง ๆ เป็นอย่างไร
        console.log('📦 หน้าตา Data ที่ส่งมาจากหลังบ้านจริง ๆ:', response.body);

        // 2. ปรับตัวแปรดักจับข้อมูลให้ยืดหยุ่น (รองรับทั้งแบบส่ง Array ตรง ๆ หรือส่งครอบใน data/history)
        const historyList = Array.isArray(response.body) 
            ? response.body 
            : (response.body.data || response.body.history || []);

        // ตรวจสอบว่าต้องแกะออกมาเป็น Array ได้สำเร็จ
        expect(Array.isArray(historyList)).toBe(true);

        // 3. 🚨 [จุดตรวจสอบความปลอดภัยสูงสุด]: 
        // วนลูปเช็คใน historyList ที่แกะออกมาแล้วว่าห้ามเห็นของ User 20 เด็ดขาด
        historyList.forEach(history => {
            expect(history.userId).toBe(10); 
            expect(history.userId).not.toBe(20); 
        });

        console.log(`📌 จำนวนประวัติของ User A ที่ระบบพ่นออกมาจริง: ${historyList.length} รายการ`);
    });
});