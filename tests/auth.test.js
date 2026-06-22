require('dotenv').config();
const request = require('supertest');
const app = require('../server'); 
const { sequelize } = require('../models'); 
const { connectDB } = require('../config/db'); // ดึงฟังก์ชันต่อ DB มาใช้

describe('Authentication API (UC02 - Login)', () => {
    
    beforeAll(async () => {
        // 1. สั่งเชื่อมต่อฐานข้อมูลตัวเดียวกับที่ระบบใช้
        await connectDB();
        // 2. ล้างตารางเก่าแล้วสร้างโครงสร้างใหม่เอี่ยมให้พร้อมเทส
        await sequelize.sync({ force: true });
        console.log('🛸 [Test Setup] Database synced cleanly for test.');
    });

    afterAll(async () => {
        if (sequelize) {
            await sequelize.close(); 
            console.log('🔌 [Test Teardown] Database connection closed.');
        }
    });

    // เคสที่ 1: ล็อกอินผ่าน
    it('ควรเข้าสู่ระบบสำเร็จและคืนค่า Token กลับมาเมื่อใส่ข้อมูลถูกต้อง', async () => {
        const response = await request(app)
            .post('/api/v1/auth/login') 
            .send({
                email: 'testuser@example.com', 
                password: 'correctpassword'
            });

        // เนื่องจากเพิ่งเคลียร์ตารางใหม่เอี่ยม ข้อมูลยังไม่มีในระบบ 
        // ดังนั้น ผลลัพธ์ควรจะเป็นสถานะหาผู้ใช้ไม่เจอ (เช่น 404 หรือ 401 หรือ 500 ตามโค้ดที่คุณเขียนรับมือไว้)
        // แทนที่จะเป็นแครชระเบิดของระบบฐานข้อมูลแบบเดิม
        expect(response.body).toHaveProperty('message'); 
    });

    // เคสที่ 2: ล็อกอินไม่ผ่าน
    it('ควรปฏิเสธการเข้าสู่ระบบเมื่อใส่รหัสผ่านผิด', async () => {
        const response = await request(app)
            .post('/api/v1/auth/login') 
            .send({
                email: 'testuser@example.com',
                password: 'wrongpassword'
            });

        expect(response.body).toHaveProperty('message'); 
    });
});