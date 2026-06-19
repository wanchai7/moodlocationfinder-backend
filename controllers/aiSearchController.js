const { GoogleGenerativeAI } = require("@google/generative-ai");

// ตรวจสอบว่ามี API Key หรือไม่ (ใช้คีย์จาก process.env)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key");

exports.analyzeEmotion = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ message: "กรุณาส่งข้อความมาวิเคราะห์" });
    }

    // 🌟 1. ใช้โมเดล gemini-1.5-flash (รองรับเวอร์ชัน 0.24.1 ได้เสถียรที่สุดและเร็วกว่า)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 🌟 2. ใช้ Prompt ตามที่ผู้ใช้ต้องการ — บังคับให้ AI ตอบเป็น JSON เท่านั้น
    const prompt = `
คุณคือ AI ผู้เชี่ยวชาญด้านจิตวิทยาและการวิเคราะห์ความรู้สึก หน้าที่ของคุณคือการอ่านข้อความแชทจากผู้ใช้งาน และจัดหมวดหมู่ข้อความนั้นให้อยู่ใน "อารมณ์ 5 ประเภท" อย่างใดอย่างหนึ่งเท่านั้น

อารมณ์ทั้ง 5 ประเภท ได้แก่:
1. "มีความสุข" (Happy) - พลังงานบวก, อารมณ์ดี, ตื่นเต้น
2. "โกรธ" (Angry) - หงุดหงิด, ไม่พอใจ, หัวเสีย
3. "เบื่อ" (Bored) - เซ็ง, ว่างเปล่า, ขาดแรงจูงใจ
4. "เศร้า" (Sad) - หดหู่, เสียใจ, โดดเดี่ยว
5. "เครียด" (Stressed) - วิตกกังวล, กดดัน, เหนื่อยล้า, รวมถึง "อาการทางร่างกาย" ที่มักเกิดจากความเครียด เช่น ปวดหัว, ปวดท้อง, นอนไม่หลับ

กฎเหล็กสำหรับการประมวลผล:
1) หากผู้ใช้พิมพ์อาการทางกาย (เช่น ปวดท้อง, ปวดหลัง) โดยไม่มีบริบทอื่น ให้ตีความว่าร่างกายกำลังประท้วงจากความ "เครียด" หรือความเหนื่อยล้าสะสม
2) ห้ามตอบเป็นประโยคสนทนาทั่วไปเด็ดขาด
3) ให้ตอบกลับมาเป็นรูปแบบโครงสร้าง JSON เท่านั้น (ไม่มีข้อความอื่นใด)

รูปแบบ JSON ที่ต้องการให้ตอบกลับ:
{
  "emotion": "อารมณ์ที่วิเคราะห์ได้ (เลือกคำใดคำหนึ่ง: มีความสุข, โกรธ, เบื่อ, เศร้า, เครียด)",
  "reason": "คำอธิบายสั้นๆ ว่าทำไมถึงเป็นอารมณ์นี้ (เพื่อเอาไปแสดงเป็นข้อความปลอบใจให้ผู้ใช้)"
}

ตัวอย่างการทำงาน:
Input: "ปวดท้องจังเลย"
Output: { "emotion": "เครียด", "reason": "อาการปวดท้องมักเป็นสัญญาณเตือนของร่างกายเมื่อมีความเครียดสะสมหรือพักผ่อนไม่เพียงพอ" }

Input: "วันนี้สอบผ่านแล้วโว้ยยย"
Output: { "emotion": "มีความสุข", "reason": "คุณกำลังรู้สึกยินดีและมีพลังงานบวกจากความสำเร็จ" }

จงวิเคราะห์ข้อความต่อไปนี้: "${text}"

ตอบกลับมาเป็น JSON ตามโครงสร้างด้านบนเท่านั้น (ห้ามมีคำอธิบายหรือข้อความเพิ่มเติม)
    `;

    // สั่งให้ AI ประมวลผล
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // 🌟 3. ล้างขยะ: ลบเครื่องหมาย ```json และ ``` ที่ AI มักจะชอบใส่มาเกิน (ตัวการที่ทำให้เกิด Error 500)
    let cleanText = responseText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    // ค้นหาขอบเขตโครงสร้าง JSON Object เพื่อป้องกันข้อผิดพลาดกรณี AI พ่นข้อความอื่นมารอบๆ
    const startIdx = cleanText.indexOf("{");
    const endIdx = cleanText.lastIndexOf("}");
    if (startIdx !== -1 && endIdx !== -1) {
      cleanText = cleanText.substring(startIdx, endIdx + 1);
    }

    // แปลงข้อความที่ทำความสะอาดแล้วให้กลายเป็น JSON Object
    const parsedData = JSON.parse(cleanText);

    // ปรับรูปแบบอารมณ์ให้อยู่ในมาตรฐานระบบหลังบ้าน (สุข -> มีความสุข)
    // เพื่อให้ระบบนำค่าไปดึงข้อมูลสถานที่ตาม mood ใน database ได้ถูกต้อง
    let finalEmotion = parsedData.emotion
      ? parsedData.emotion.trim()
      : "เครียด";
    if (finalEmotion === "สุข" || finalEmotion === "มีความสุข") {
      finalEmotion = "มีความสุข";
    }

    // ส่งข้อมูลกลับไปให้ Frontend
    res.status(200).json({
      emotion: finalEmotion,
      reason:
        parsedData.reason || "เราเข้าใจคุณนะ ลองไปผ่อนคลายในสถานที่แนะนำดูสิ",
    });
  } catch (error) {
    console.error("Gemini AI Error:", error);

    // Fallback: ถ้า AI ล่มจริงๆ ให้พ่นค่าพื้นฐานกลับไป จะได้ไม่เกิด Error 500 บนหน้าเว็บ
    res.status(200).json({
      emotion: "เครียด",
      reason:
        "ระบบ AI ขัดข้องชั่วคราว แต่เราพร้อมที่จะช่วยแนะนำสถานที่พักผ่อนให้คุณ",
    });
  }
};
