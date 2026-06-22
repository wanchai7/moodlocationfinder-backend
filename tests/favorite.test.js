require('dotenv').config();
const request = require('supertest');
const app = require('../server');
const { sequelize } = require('../models');
const { connectDB } = require('../config/db');

describe('Favorites API (UC07 - Save Favorites)', () => {
    let authToken;       // ไว้เก็บ JWT Token หลังจากล็อกอินสำเร็จ
    let samplePlaceId;   // ไว้เก็บ ID ของสถานที่ที่จะกดบันทึกโปรด

    beforeAll(async () => {
        await connectDB();
        // ล้างฐานข้อมูลเพื่อเตรียมสภาพแวดล้อมที่สะอาด
        await sequelize.sync({ force: true });

        // 1. สร้างข้อมูลสถานที่จำลอง (Place) ไว้ทดสอบการถูกกดบันทึกโปรด
        if (sequelize.models.Place) {
            const place = await sequelize.models.Place.create({
                name: 'จุดชมวิวทะเลหมอก',
                category: 'mountain',
                description: 'สัมผัสอากาศหนาวและทะเลหมอกยามเช้า',
                latitude: 19.1234,
                longitude: 99.5678
            });
            samplePlaceId = place.id;
        }

        // 2. สร้างบัญชีผู้ใช้จำลอง (User) และทำการจำลองการ Login เพื่อดึง Token มาเก็บไว้
        if (sequelize.models.User) {
            const hashedPassword = 'securepassword123'; // ในระบบจริงควรตรงกับวิธีแฮชของคุณ
            await sequelize.models.User.create({
                firstName: 'Test',
                lastName: 'Favorites',
                email: 'favtest@example.com',
                password: hashedPassword,
                gender: 'female',
                role: 'user',
                isVerified: true // สมมติว่ายืนยันตัวตนผ่านแล้วเพื่อล็อกอินได้
            });

            // ทำการจำลองการยิง Login ไปที่ Auth API เพื่อขอ Token จริงของระบบมาใช้งาน
            const loginRes = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'favtest@example.com',
                    password: 'securepassword123'
                });
            
            // เก็บ Token ไว้ในตัวแปร (ปรับตามโครงสร้าง response ของคุณ เช่น loginRes.body.token)
            authToken = loginRes.body.token; 
        }

        console.log('🛸 [Test Setup] Initialized database, created mock data, and retrieved Auth Token.');
    });

    afterAll(async () => {
        if (sequelize) {
            await sequelize.close();
            console.log('🔌 [Test Teardown] Database connection closed.');
        }
    });

    // ==========================================================
    // เคสที่ 1: ตรวจสอบสิทธิ์ - ไม่ได้ล็อกอิน (ไม่มี Token) ต้องโดนปฏิเสธ
    // ==========================================================
    it('ควรปฏิเสธการเข้าถึงและคืนค่า 401 เมื่อพยายามบันทึกรายการโปรดโดยไม่ได้ Login', async () => {
        const response = await request(app)
            .post('/api/v1/favorites') // 👈 ปรับตาม Endpoint จริงของคุณ (เช่น /api/v1/favorites หรือ /places/:id/favorite)
            .send({
                placeId: samplePlaceId // ส่งไอดีสถานที่ไปตัวเปล่าๆ ไม่แถม Token
            });

        // 📊 Expected Output:
        // ระบบต้องรักษาความปลอดภัย ตีกลับเป็น 401 Unauthorized เสมอ
        expect(response.statusCode).toBe(401);
    });

    // ==========================================================
    // เคสที่ 2: ตรวจสอบสิทธิ์ - ล็อกอินแล้ว (มี Token ถูกต้อง) ต้องผ่าน
    // ==========================================================
    it('ควรบันทึกรายการโปรดสำเร็จเมื่อผู้ใช้ทำการส่ง Token ที่ถูกต้องแนบไปด้วย', async () => {
        // เช็คก่อนว่าขั้นตอนก่อนหน้า (beforeAll) ได้ Token มาจริงๆ ไม่ใช่ค่าว่าง
        expect(authToken).toBeDefined();

        const response = await request(app)
            .post('/api/v1/favorites')
            .set('Authorization', `Bearer ${authToken}`) // 🔑 แอบแนบคีย์ Token เข้าไปใน Header ตามมาตรฐาน JWT
            .send({
                placeId: samplePlaceId
            });

        // 📊 Expected Output:
        // 1. ระบบต้องยอมรับคำสั่งสำเร็จ (คืนค่า 200 OK หรือ 201 Created ตามที่หลังบ้านคุณเขียนรับไว้)
        expect([200, 201]).toContain(response.statusCode);
        
        // 2. ควรส่งข้อความยืนยันการบันทึกกลับมา
        expect(response.body).toHaveProperty('message');
    });
});