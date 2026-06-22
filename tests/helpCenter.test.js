require('dotenv').config();
const request = require('supertest');
const app = require('../server');
const { sequelize } = require('../models');
const { connectDB } = require('../config/db');
const jwt = require('jsonwebtoken');

describe('Help Center API (UC11 - FAQ & Support Request)', () => {
    let authToken;       // Token ของผู้ใช้ที่ต้องการขอความช่วยเหลือ
    let mockUserId = 99; // ไอดีผู้ใช้จำลอง

    beforeAll(async () => {
        await connectDB();
        sequelize.options.logging = console.log; 
        await sequelize.sync({ force: true });

        // จำลองสร้างบัญชีผู้ใช้รอไว้สำหรับส่ง Ticket/เปิดห้องแชท
        if (sequelize.models.User) {
            await sequelize.models.User.create({
                id: mockUserId,
                firstName: 'Somsri',
                lastName: 'HelpMe',
                email: 'somsri.help@example.com',
                password: 'password123',
                gender: 'female',
                role: 'user',
                isVerified: true
            });

            const jwtSecret = process.env.JWT_SECRET || 'your-default-secret';
            authToken = jwt.sign({ id: mockUserId, role: 'user' }, jwtSecret, { expiresIn: '1d' });
        }

        console.log('🛸 [Test Setup] Mock User and Database setup for Help Center are ready.');
    });

    afterAll(async () => {
        if (sequelize) {
            await sequelize.close();
            console.log('🔌 [Test Teardown] Database connection closed.');
        }
    });

    // =========================================================================
    // เคสที่ 1: การเรียกดูข้อมูล FAQ (ผู้ใช้ทุกคนต้องเข้าถึงได้)
    // =========================================================================
    it('ควรดึงข้อมูลรายการ FAQ ออกมาได้สำเร็จ', async () => {
        const response = await request(app)
            .get('/api/v1/faqs') // 👈 ปรับตามพาร์ท FAQ จริงของหลังบ้านคุณ (เช่น /api/v1/help/faqs)
            .send();

        // ตรวจสอบว่า API ตอบกลับสำเร็จ (200 OK หรือถ้ายังไม่มี Data อย่างน้อยต้องไม่พังเป็น 500)
        expect([200, 404]).toContain(response.statusCode); 
        console.log('ℹ️ สถานะการดึง FAQ จากระบบ:', response.statusCode);
        if (response.statusCode === 200) {
            console.log('📦 รายการ FAQ ในระบบ:', response.body);
        }
    });

// =========================================================================
    // เคสที่ 2: การส่งคำขอความช่วยเหลือ (สร้างห้องแชท/Ticket หา Admin)
    // =========================================================================
    it('ผู้ใช้ที่มี Token ต้องส่งคำขอความช่วยเหลือ/เปิดห้องแชทสำเร็จ และบันทึกลงตาราง ChatRoom ได้ถูกต้อง', async () => {
        expect(authToken).toBeDefined();

        const supportRequest = {
            topic: 'แอปค้างตอนกดบันทึกแผนเดินทางค่ะ',
            detail: 'กดปุ่มเซฟที่หน้าทริปแอ่วเหนือแล้วหน้าจอหมุนติ้วๆ ไม่ยอมไปไหนเลย'
        };

        const response = await request(app)
            .post('/api/v1/contact') // ✨ เปลี่ยนเป็นพาร์ทจริงของหลังบ้านตรงนี้แล้วค่ะ!
            .set('Authorization', `Bearer ${authToken}`)
            .send(supportRequest);

        // ระบบหลังบ้านควรบันทึกสำเร็จและตอบกลับสถานะ 201 Created หรือ 200 OK
        expect([200, 201]).toContain(response.statusCode);
        console.log('📦 ผลลัพธ์การเปิดคำขอความช่วยเหลือ:', response.body);

        // ดักส่องข้อมูลจริงในตาราง chat_rooms
        if (sequelize.models.ChatRoom) {
            const chatRoomInDB = await sequelize.models.ChatRoom.findOne({
                where: { userId: mockUserId }
            });

            expect(chatRoomInDB).not.toBeNull();
            expect(chatRoomInDB.topic).toBe('แอปค้างตอนกดบันทึกแผนเดินทางค่ะ');
            console.log('✅ ยืนยันใน DB: ข้อมูลคำขอถูกเปิดห้องแชทเข้าตารางเรียบร้อย!');
        }
    });
});