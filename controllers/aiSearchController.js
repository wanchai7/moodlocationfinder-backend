const { GoogleGenerativeAI } = require('@google/generative-ai');

// Check if API key is provided, if not, wait for user to set it
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key");

exports.analyzeEmotion = async (req, res) => {
    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({ message: "กรุณาส่งข้อความ (text) ที่ต้องการวิเคราะห์มาใน body" });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ message: "ไม่ได้ตั้งค่า GEMINI_API_KEY ในระบบ" });
        }

        const prompt = `
คุณคือ AI ผู้เชี่ยวชาญด้านจิตวิทยาและการวิเคราะห์ความรู้สึก หน้าที่ของคุณคือการอ่านข้อความแชทจากผู้ใช้งาน และจัดหมวดหมู่ข้อความนั้นให้อยู่ใน "อารมณ์ 5 ประเภท" อย่างใดอย่างหนึ่งเท่านั้น

อารมณ์ทั้ง 5 ประเภท ได้แก่:
1. "มีความสุข" (Happy) - พลังงานบวก, อารมณ์ดี, ตื่นเต้น
2. "โกรธ" (Angry) - หงุดหงิด, ไม่พอใจ, หัวเสีย
3. "เบื่อ" (Bored) - เซ็ง, ว่างเปล่า, ขาดแรงจูงใจ
4. "เศร้า" (Sad) - หดหู่, เสียใจ, โดดเดี่ยว
5. "เครียด" (Stressed) - วิตกกังวล, กดดัน, เหนื่อยล้า, รวมถึง "อาการทางร่างกาย" ที่มักเกิดจากความเครียด เช่น ปวดหัว, ปวดท้อง, นอนไม่หลับ

กฎเหล็กสำหรับการประมวลผล:
- หากผู้ใช้พิมพ์อาการทางกาย (เช่น ปวดท้อง, ปวดหลัง) โดยไม่มีบริบทอื่น ให้ตีความว่าร่างกายกำลังประท้วงจากความ "เครียด" หรือความเหนื่อยล้าสะสม
- ห้ามตอบเป็นประโยคสนทนาทั่วไปเด็ดขาด 
- ให้ตอบกลับมาเป็นรูปแบบโครงสร้าง JSON เท่านั้น เพื่อให้ระบบนำไปใช้งานต่อได้

รูปแบบ JSON ที่ต้องการให้ตอบกลับ:
{
  "emotion": "อารมณ์ที่วิเคราะห์ได้ (เลือกคำใดคำหนึ่ง: มีความสุข, โกรธ, เบื่อ, เศร้า, เครียด)",
  "reason": "คำอธิบายสั้นๆ ว่าทำไมถึงเป็นอารมณ์นี้ (เพื่อเอาไปแสดงเป็นข้อความปลอบใจให้ผู้ใช้)"
}

ข้อความที่ต้องการวิเคราะห์: "${text}"
`;

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // ตัด backticks และทำความสะอาด String ให้เป็น JSON เท่านั้น
        let jsonStr = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
        
        const jsonResult = JSON.parse(jsonStr);

        return res.status(200).json(jsonResult);
    } catch (error) {
        console.error("AI Emotion Analysis Error:", error);
        return res.status(500).json({ 
            message: "เกิดข้อผิดพลาดในการวิเคราะห์อารมณ์จาก AI",
            error: error.message 
        });
    }
};
