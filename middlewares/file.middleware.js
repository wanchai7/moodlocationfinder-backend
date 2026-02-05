// นำเข้าไลบรารี multer เพื่อจัดการการส่งข้อมูลแบบฟอร์มที่มีไฟล์ (multipart/form-data)
const multer = require("multer");
// นำเข้าโมดูล path เพื่อจัดการกับเส้นทางไฟล์และนามสกุลไฟล์
const path = require("path");
// นำเข้าค่าคอนฟิกูเรชัน (URL และ API Key) สำหรับเชื่อมต่อกับ Supabase จากไฟล์ภายนอก
const supabaseConfig = require("../config/supabase.config");

// ดึงฟังก์ชัน createClient มาจากไลบรารี supabase-js เพื่อสร้างตัวเชื่อมต่อ
const { createClient } = require("@supabase/supabase-js");

// เริ่มต้นสร้างตัวเชื่อมต่อกับ Supabase โดยใช้ URL และ Key ที่เตรียมไว้
const supabase = createClient(supabaseConfig.url, supabaseConfig.key);

// ตั้งค่าคอนฟิกูเรชันสำหรับ Multer ในการรับไฟล์
const upload = multer({
  // กำหนดให้เก็บไฟล์ไว้ในหน่วยความจำชั่วคราว (RAM) แทนการเขียนลงดิสก์
  storage: multer.memoryStorage(),
  // จำกัดขนาดไฟล์ที่ส่งมาห้ามเกิน 1,000,000 ไบต์ หรือประมาณ 1MB
  limits: { fileSize: 1000000 }, 
  // ฟังก์ชันสำหรับกรองไฟล์ก่อนรับเข้าสู่ระบบ
  fileFilter: (req, file, cb) => {
    // แสดงข้อมูลไฟล์ที่ได้รับมาในหน้าจอ Console เพื่อตรวจสอบ
    console.log(file);
    // เรียกใช้ฟังก์ชันตรวจสอบประเภทไฟล์ที่เขียนไว้ด้านล่าง
    checkFileType(file, cb);
  },
// กำหนดให้รับไฟล์เพียงไฟล์เดียวจากฟิลด์ที่ชื่อว่า "file" ใน Request
}).single("file");

// ฟังก์ชันสำหรับตรวจสอบนามสกุลและประเภทของไฟล์รูปภาพ
function checkFileType(file, cb) {
  // กำหนดรูปแบบ (Regex) ของนามสกุลไฟล์ภาพที่อนุญาตให้ใช้ได้
  const fileTypes = /jpeg|jpg|png|gif|webp/; 
  // ตรวจสอบว่านามสกุลไฟล์จริงตรงตามที่กำหนดไว้หรือไม่ (แปลงเป็นตัวพิมพ์เล็กก่อนเช็ค)
  const extName = fileTypes.test(
    path.extname(file.originalname).toLocaleLowerCase()
  );
  // ตรวจสอบประเภท Mimetype ของไฟล์ (เช่น image/png) ว่าตรงตามที่กำหนดหรือไม่
  const mimetype = fileTypes.test(file.mimetype);
  
  // หากทั้งประเภทไฟล์และนามสกุลถูกต้อง
  if (mimetype && extName) {
    // พิมพ์บอกว่าไฟล์ผ่านการตรวจสอบ
    console.log("file accepted");
    // ส่งค่ากลับว่าให้ดำเนินการต่อได้ (ไม่มี Error)
    return cb(null, true);
  } else {
    // หากไม่ถูกต้อง ให้ส่งข้อความ Error กลับไป
    cb("Error image only!!");
  }
}

// ฟังก์ชัน Middleware สำหรับอัปโหลดไฟล์ที่ผ่านการคัดกรองแล้วไปยัง Supabase Storage
async function uploadToSupabase(req, res, next) {
  // หากไม่มีไฟล์ส่งมาใน Request (ผู้ใช้อาจไม่ได้แนบรูป)
  if (!req.file) {
    // พิมพ์บอกว่าไม่มีไฟล์ให้อัปโหลด
    console.log("No file to upload");
    // ข้ามไปทำงานใน Middleware ตัวถัดไปทันที
    next();
    // จบการทำงานในฟังก์ชันนี้
    return;
  }

  try {
    // สร้างชื่อไฟล์ใหม่โดยใช้เวลาปัจจุบัน (Timestamp) ต่อหน้าชื่อเดิม เพื่อป้องกันชื่อไฟล์ซ้ำในระบบ
    const fileName = `${Date.now()}-${req.file.originalname}`;

    // เรียกใช้บริการ Storage ของ Supabase เพื่ออัปโหลดไฟล์
    const { data, error } = await supabase.storage
      // ระบุชื่อ Bucket ที่ต้องการเก็บไฟล์ (ตรวจสอบว่าในระบบใช้ upload หรือ uploads)
      .from("uploads") 
      // สั่งอัปโหลดโดยส่งชื่อไฟล์ใหม่ และข้อมูลไฟล์แบบ Buffer จาก RAM
      .upload(fileName, req.file.buffer, {
        // ระบุประเภทไฟล์เพื่อให้ Browser แสดงผลรูปภาพได้ถูกต้อง
        contentType: req.file.mimetype,
        // ตั้งค่าให้ Browser เก็บแคชของรูปนี้ไว้นาน 3,600 วินาที (1 ชั่วโมง)
        cacheControl: "3600",
        // ตั้งค่าห้ามเขียนทับไฟล์เดิมที่มีชื่อซ้ำกัน
        upsert: false,
      });

    // หากเกิด Error ระหว่างอัปโหลดไปยัง Supabase
    if (error) {
      // ส่ง Error ไปที่ส่วน catch เพื่อจัดการ
      throw error;
    }

    // เมื่ออัปโหลดเสร็จ ให้ขอ URL สาธารณะที่ใช้สำหรับเข้าถึงรูปภาพนั้นๆ
    const {
      data: { publicUrl },
    } = supabase.storage.from("uploads").getPublicUrl(fileName);

    // นำ URL สาธารณะที่ได้ ไปเก็บไว้ในอ็อบเจกต์ req.file เพื่อส่งต่อให้ Controller นำไปเก็บลงฐานข้อมูล
    req.file.supabaseUrl = publicUrl;
    // พิมพ์ URL ที่ได้ออกมาดูใน Console
    console.log(req.file.supabaseUrl);
    // ทำงานในฟังก์ชันถัดไป (ปกติจะเป็นฟังก์ชันสร้าง Post ใน Controller)
    next();
  } catch (error) {
    // หากเกิดข้อผิดพลาดในขั้นตอนใดๆ ให้ส่ง Response สถานะ 500 กลับไปหา Client
    res.status(500).json({
      message:
        // ส่งข้อความ Error จากระบบ หรือข้อความ Default ที่ตั้งไว้
        error.message || "Something went wrong while uploading to supabase",
    });
  }
}

// ส่งออกฟังก์ชัน upload และ uploadToSupabase เพื่อให้ไฟล์ Router นำไปใช้งานได้
module.exports = { upload, uploadToSupabase };