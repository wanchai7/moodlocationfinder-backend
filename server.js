require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const User = require('./models/User');

const app = express();
connectDB();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// --- API สำหรับสมัครสมาชิก (Sign Up) ---
app.post('/api/signup', async (req, res) => {
  try {
    const { firstName, lastName, email, password, gender } = req.body;

    // ตรวจสอบข้อมูลเบื้องต้น
    if (!firstName || !lastName || !email || !password || !gender) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบทุกช่อง' });
    }

    // ตรวจสอบอีเมลซ้ำ
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'อีเมลนี้ถูกใช้งานไปแล้วในระบบ' });
    }

    const newUser = new User({ firstName, lastName, email, password, gender });

    // บรรทัดนี้จะไปเรียก middleware ใน User.js ที่เราเพิ่งแก้ไป
    await newUser.save();

    res.status(201).json({ message: 'ลงทะเบียนสำเร็จ! 🎉' });
  } catch (err) {
    console.error("Signup Error Details:", err);
    res.status(400).json({ error: err.message || 'เกิดข้อผิดพลาดในการลงทะเบียน' });
  }
});

// --- API สำหรับเข้าสู่ระบบ (Login) ---
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user && await user.comparePassword(password)) {
      res.status(200).json({
        message: 'เข้าสู่ระบบสำเร็จ! 🔑',
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          gender: user.gender,
          profileImage: user.profileImage || ''
        }
      });
    } else {
      res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' });
  }
});

// --- API สำหรับดึงข้อมูลโปรไฟล์ ---
app.get('/api/profile/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'ไม่พบผู้ใช้ในระบบ' });
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลได้' });
  }
});

// --- API สำหรับอัปเดตโปรไฟล์ ---
app.put('/api/profile/:id', async (req, res) => {
  try {
    const { firstName, lastName, gender, profileImage } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { firstName, lastName, gender, profileImage },
      { new: true }
    ).select('-password');

    if (!updatedUser) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    res.status(200).json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: 'อัปเดตข้อมูลล้มเหลว' });
  }
});

const History = require('./models/History');

// ... (existing code)

// --- API สำหรับประวัติการนำทาง (History) ---
// 1. บันทึกประวัติ
app.post('/api/history', async (req, res) => {
  try {
    const { userId, locationId, name, type, date, time } = req.body;

    if (!userId || !locationId || !name) {
      return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });
    }

    const newHistory = new History({
      userId,
      locationId,
      name,
      type: type || 'forest', // Default fallback
      date,
      time
    });

    await newHistory.save();
    res.status(201).json({ message: 'บันทึกประวัติเรียบร้อย', data: newHistory });

  } catch (err) {
    console.error("Save History Error:", err);
    res.status(500).json({ error: 'บันทึกประวัติล้มเหลว' });
  }
});

// 2. ดึงประวัติของ User
app.get('/api/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const history = await History.find({ userId }).sort({ timestamp: -1 }); // เรียงจากล่าสุดไปเก่าสุด
    res.status(200).json(history);
  } catch (err) {
    console.error("Get History Error:", err);
    res.status(500).json({ error: 'ดึงข้อมูลประวัติล้มเหลว' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:5000 `));

app.get("/", (req, res) => {
  res.send("<h1>Hello World! Server Mood Location Finder</h1>");
}); 