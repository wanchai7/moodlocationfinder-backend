require('dotenv').config();
const request = require('supertest');
const app = require('../server');
const { sequelize } = require('../models');
const { connectDB } = require('../config/db');

describe('Place API (UC05 / UC06)', () => {
    let samplePlaceId; // 💡 ตัวแปรสำหรับเก็บ ID ของสถานที่จำลองเพื่อเอาไปใช้เทสต่อใน UC06

    beforeAll(async () => {
        await connectDB();
        // ใช้ force: true เพื่อล้างตารางและสร้างข้อมูลสถานที่จำลอง (Mock Data) ขึ้นมาใหม่ให้พร้อมเทส
        await sequelize.sync({ force: true });

        // 🏗️ จำลองข้อมูลสถานที่ 1 แห่งลงฐานข้อมูล เพื่อใช้ทดสอบการดึงข้อมูล
        // (ปรับชื่อ Model 'Place' และฟิลด์ด้านล่างให้ตรงกับ models/place.js ของคุณนะครับ)
        if (sequelize.models.Place) {
            const place = await sequelize.models.Place.create({
                name: 'คาเฟ่ริมน้ำสุดชิล',
                category: 'cafe', // หมวดหมู่ที่จะใช้เทสใน UC05
                description: 'บรรยากาศดี ลมเย็นสบาย เหมาะแก่การพักผ่อน',
                latitude: 14.1234,
                longitude: 100.5678
            });
            samplePlaceId = place.id; // เก็บ ID ไว้ใช้ในเคสถัดไป
            console.log(`🏗️ [Test Setup] Created sample place with ID: ${samplePlaceId}`);
        }
        console.log('🛸 [Test Setup] Database connected and initialized for Place testing.');
    });

    afterAll(async () => {
        if (sequelize) {
            await sequelize.close();
            console.log('🔌 [Test Teardown] Database connection closed.');
        }
    });

    // ==========================================
    // UC05: เลือกหมวดหมู่สถานที่
    // ==========================================
    it('UC05 - ควรคืนค่ารายการสถานที่ตามหมวดหมู่ที่ระบุได้ถูกต้อง', async () => {
        const response = await request(app)
            .get('/api/v1/places') // 👈 ปรับตาม Route จริงของคุณ (เช่น /api/v1/places?category=cafe)
            .query({ category: 'cafe' }); // ส่ง Query string ไปจำลองการเลือกหมวดหมู่ "cafe"

        // 📊 Expected Output:
        // 1. ต้องได้ Status Code 200 OK
        expect(response.statusCode).toBe(200);
        // 2. ข้อมูลที่ส่งกลับมาต้องเป็น Array ของสถานที่ หรือมี Property เก็บข้อมูล
        expect(Array.isArray(response.body) || response.body.hasOwnProperty('places')).toBe(true);
    });

// ==========================================
    // UC06: ดูรายละเอียดสถานที่
    // ==========================================
    it('UC06 - ควรคืนค่ารายละเอียดข้อมูลของสถานที่ตาม ID ที่ระบุได้ถูกต้อง', async () => {
        expect(samplePlaceId).toBeDefined();

        const response = await request(app)
            .get(`/api/v1/places/${samplePlaceId}`);

        // 📊 Expected Output:
        // 1. ต้องได้ Status Code 200 OK
        expect(response.statusCode).toBe(200);

        // 2. ✨ แก้ไขตรงนี้: เจาะเข้าไปตรวจที่ response.body.place แทนชั้นนอก
        expect(response.body).toHaveProperty('place'); // เช็คว่ามีคีย์ห่อหุ้มชื่อ place ไหม
        expect(response.body.place).toHaveProperty('name'); // เช็คว่าข้างใน place มี name ไหม
        expect(response.body.place.name).toBe('คาเฟ่ริมน้ำสุดชิล'); // เช็คว่าชื่อตรงกันไหม
    });
});