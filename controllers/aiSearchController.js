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

    // 🌟 2. เขียน Prompt บังคับให้ AI ตอบกลับมาเป็น JSON ตามรูปแบบเป๊ะๆ
    const prompt = `
      คุณคือนักจิตวิทยาที่เชี่ยวชาญด้านการวิเคราะห์อารมณ์จากข้อความ
      จงวิเคราะห์ข้อความต่อไปนี้: "${text}"
      
      ตอบกลับมาในรูปแบบ JSON ตามโครงสร้างด้านล่างนี้ "เท่านั้น" ห้ามมีคำอธิบายอื่นเพิ่มเติม:
      {
        "emotion": "ระบุคำใดคำหนึ่ง: สุข / เศร้า / เบื่อ / เครียด / โกรธ",
        "reason": "คำอธิบายสั้นๆ ภาษาไทย 1 ประโยค ว่าทำไมเขาถึงรู้สึกแบบนี้"
      }
    `;

    // สั่งให้ AI ประมวลผล
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // 🌟 3. ล้างขยะ: ลบเครื่องหมาย ```json และ ``` ที่ AI มักจะชอบใส่มาเกิน (ตัวการที่ทำให้เกิด Error 500)
    let cleanText = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();

    // ค้นหาขอบเขตโครงสร้าง JSON Object เพื่อป้องกันข้อผิดพลาดกรณี AI พ่นข้อความอื่นมารอบๆ
    const startIdx = cleanText.indexOf('{');
    const endIdx = cleanText.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1) {
        cleanText = cleanText.substring(startIdx, endIdx + 1);
    }

    // แปลงข้อความที่ทำความสะอาดแล้วให้กลายเป็น JSON Object
    const parsedData = JSON.parse(cleanText);

    // ปรับรูปแบบอารมณ์ให้อยู่ในมาตรฐานระบบหลังบ้าน (สุข -> มีความสุข) 
    // เพื่อให้ระบบนำค่าไปดึงข้อมูลสถานที่ตาม mood ใน database ได้ถูกต้อง
    let finalEmotion = parsedData.emotion ? parsedData.emotion.trim() : "เครียด";
    if (finalEmotion === "สุข" || finalEmotion === "มีความสุข") {
      finalEmotion = "มีความสุข";
    }

    // ส่งข้อมูลกลับไปให้ Frontend
    res.status(200).json({
      emotion: finalEmotion,
      reason: parsedData.reason || "เราเข้าใจคุณนะ ลองไปผ่อนคลายในสถานที่แนะนำดูสิ"
    });

  } catch (error) {
    console.error("Gemini AI Error:", error);
    
    // Fallback: ถ้า AI ล่มจริงๆ ให้พ่นค่าพื้นฐานกลับไป จะได้ไม่เกิด Error 500 บนหน้าเว็บ
    res.status(200).json({
      emotion: "เครียด",
      reason: "ระบบ AI ขัดข้องชั่วคราว แต่เราพร้อมที่จะช่วยแนะนำสถานที่พักผ่อนให้คุณ"
    });
  }
};

