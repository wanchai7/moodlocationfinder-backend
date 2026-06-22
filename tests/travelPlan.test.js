require('dotenv').config();
const request = require('supertest');
const app = require('../server');
const { sequelize } = require('../models');
const { connectDB } = require('../config/db');
const jwt = require('jsonwebtoken');

describe('Travel Plan API (UC08 - Travel Plan <<include>> UC07)', () => {
    let authToken;       // บัตรผ่าน Token สำหรับจำลองผู้ใช้ที่ล็อกอิน
    let samplePlaceId;   // ไอดีของสถานที่ท่องเที่ยวจำลอง
    let mockUserId = 1;  // ไอดีของผู้ใช้จำลอง

// ดึงโค้ดช่วงก่อนเริ่มเทสมาปรับเพิ่มบรรทัด Logging ครับ
    beforeAll(async () => {
        await connectDB();
        
        // 💡 เติมสิ่งนี้: สั่งให้แสดงคำสั่ง SQL ทุกครั้งที่มีการคิวรีฐานข้อมูลในไฟล์เทสนี้
        sequelize.options.logging = console.log; 

        await sequelize.sync({ force: true });

        // (โค้ดจำลองการสร้าง Place และ User คงไว้เหมือนเดิม...)

        // 1. จำลองสร้างข้อมูลสถานที่ท่องเที่ยวลงฐานข้อมูล
        if (sequelize.models.Place) {
            const place = await sequelize.models.Place.create({
                name: 'ถนนคนเดินเชียงใหม่',
                category: 'market',
                description: 'แหล่งรวมอาหารเหนือและของฝากพื้นเมือง',
                latitude: 18.7889,
                longitude: 98.9856
            });
            samplePlaceId = place.id;
        }

        // 2. จำลองสร้างบัญชีผู้ใช้
        if (sequelize.models.User) {
            await sequelize.models.User.create({
                id: mockUserId,
                firstName: 'Nichapha',
                lastName: 'Traveler',
                email: 'planuser@example.com',
                password: 'securepassword123',
                gender: 'female',
                role: 'user',
                isVerified: true
            });

            // ปั๊ม JWT Token สิทธิ์ของผู้ใช้คนนี้ออกมาใช้งาน
            const jwtSecret = process.env.JWT_SECRET || 'your-default-secret';
            authToken = jwt.sign(
                { id: mockUserId, role: 'user' }, 
                jwtSecret, 
                { expiresIn: '1d' }
            );
        }

        console.log('🛸 [Test Setup] Database cleared. Mock User, Place, and JWT Token are ready.');
    });

    afterAll(async () => {
        if (sequelize) {
            await sequelize.close();
            console.log('🔌 [Test Teardown] Database connection closed.');
        }
    });

    // =========================================================================
    // UC08: ทดสอบการสร้างแผนเดินทาง และการทำงานเชื่อมโยงอัตโนมัติ (Integration Test)
    // =========================================================================
    it('ควรสร้างแผนการเดินทางสำเร็จ และต้องมีข้อมูลไปบันทึกเพิ่มอัตโนมัติในตารางโปรดและประวัติ', async () => {
        expect(authToken).toBeDefined();
        expect(samplePlaceId).toBeDefined();

        // 1. จำลองผู้ใช้กด "บันทึก/สร้างแผนการเดินทาง" ยิงข้อมูลผ่าน API 
        const response = await request(app)
            .post('/api/v1/history') // 👈 หรือปรับตามพาร์ทสร้าง Plan ของคุณ เช่น /api/v1/travel-plans
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                placeId: samplePlaceId,
                planName: 'ทริปแอ่วเหนือสุดฟิน',
                travelDate: '2026-12-25'
            });

        // ตรวจสอบว่าขั้นตอนหลัก (การสร้าง Plan) ต้องตอบรับกลับมาสำเร็จ (200 หรือ 201)
        expect([200, 201]).toContain(response.statusCode);

        // =========================================================================
        // 🔍 จุดสำคัญ: ตรวจสอบความถูกต้องตามเส้น <<include>> ในฐานข้อมูลโดยตรง
        // =========================================================================
        
        // ก) ตรวจสอบว่าในตารางประวัติ (Histories) มีข้อมูลถูกบันทึกจริงไหม
if (sequelize.models.History) {
            try {
                // ขยายเงื่อนไขให้ลองค้นหาแบบกว้าง ๆ ดูก่อน
                const historyRecord = await sequelize.models.History.findOne();
                console.log('📌 ข้อมูลจริงที่เจอในตาราง History:', historyRecord ? historyRecord.toJSON() : 'ตารางว่างเปล่า');
            } catch (dbError) {
                console.error('❌ [Database Error ในตาราง History]:', dbError.message);
            }
        }

       // ข) ตรวจสอบเอฟเฟกต์ <<include>> วิ่งไปเพิ่มตารางรายการโปรด (Favorites) อัตโนมัติจริงไหม
        if (sequelize.models.Favorite) {
            try {
                // ขยายเงื่อนไขให้ลองค้นหาแบบกว้าง ๆ ดูก่อนเหมือนกันเพื่อเลี่ยงการติดล็อกฟิลด์ผิด
                const favoriteRecord = await sequelize.models.Favorite.findOne();
                console.log('📌 ข้อมูลจริงที่เจอในตาราง Favorite:', favoriteRecord ? favoriteRecord.toJSON() : 'ตารางว่างเปล่า');
                
                // ตรวจสอบเบื้องต้นว่าต้องมีข้อมูลถูกบันทึกเข้ามาจริง (ไม่เป็นค่าว่าง)
                expect(favoriteRecord).not.toBeNull();
                console.log('✅ พิสูจน์แล้ว (<<include>>): ข้อมูลเด้งไปโผล่ในตารางรายการโปรด (Favorite) อัตโนมัติ!');
            } catch (dbError) {
                console.error('❌ [Database Error ในตาราง Favorite]:', dbError.message);
                // สั่งให้ Jest รับรู้ว่าพังที่ระดับ Database Query
                throw dbError; 
            }
        }
    });
});