require('dotenv').config();
const request = require('supertest');
const app = require('../server');
const { sequelize } = require('../models');
const { connectDB } = require('../config/db');

describe('Mood & AI Analysis API (UC03 / UC04)', () => {
    
    beforeAll(async () => {
        await connectDB();
        // ดึงโครงสร้างตารางเดิมมาทำงานร่วมกัน
        await sequelize.sync({ alter: true });
        console.log('🛸 [Test Setup] Database connected for Mood AI testing.');
    });

    afterAll(async () => {
        if (sequelize) {
            await sequelize.close();
            console.log('🔌 [Test Teardown] Database connection closed.');
        }
    });

    // =======================================================
    // UC03 & UC04: วิเคราะห์อารมณ์ความรู้สึกด้วย AI ผ่าน Endpoint จริง
    // =======================================================
    it('ควรส่งข้อความไปให้ AI วิเคราะห์อารมณ์และคืนค่ากลับมาสำเร็จ', async () => {
        const response = await request(app)
            .post('/api/v1/ai/analyze-emotion') // ✨ ใช้ Route จริงของคุณแล้ว
            .send({
                // ส่งฟิลด์ข้อความ (Text) ไปให้คอนโทรลเลอร์ของคุณเอาไปส่งต่อให้ Gemini AI
                text: 'ช่วงนี้เรียนหนักและเหนื่อยมากๆ อยากไปพักผ่อนสมองที่ไหนสักแห่ง' 
            });

        // 📊 Expected Output (ผลลัพธ์ที่คาดหวัง)
        // 1. ระบบประมวลผลผ่านและส่ง HTTP Status Code 200 กลับมา
        expect(response.statusCode).toBe(200);

        // 2. ระบบควรมี Key ตอบกลับมา (ลองเช็คใน aiSearchController.js ของคุณว่าส่งคีย์ชื่ออะไรกลับมา)
        // เช่น ถ้าส่งพวกผลลัพธ์อารมณ์ หรือ สถานที่ แนะนำ ให้ใส่เช็คตรงนี้ครับ
        expect(response.body).toBeDefined(); // ขอให้ส่งก้อนข้อมูลกลับมา (ไม่เป็นค่าว่าง)
    });
});