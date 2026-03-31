const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { Op } = require("sequelize");
const { User } = require("../models");
const { io, getReceiverSocketId } = require("../lib/socket");

// ตั้งค่า Nodemailer (ดึงข้อมูลจาก .env)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_VERIFY_USER,
    pass: process.env.EMAIL_VERIFY,
  },
});

// สร้าง JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30m" });
};

// ========== UC1: สมัครสมาชิก (สำหรับ Frontend) ==========
// POST /api/auth/register
// สำหรับ frontend ใช้สมัครสมาชิก - role จะเป็น 'user' เสมอ (ไม่รับ role จาก body)
const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, gender } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!firstName || !lastName || !email || !password || !gender) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบทุกช่อง" });
    }

    // ตรวจสอบรหัสผ่านขั้นต่ำ 6 ตัว
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" });
    }

    // สร้าง Token สำหรับการยืนยันอีเมลด้วย crypto
    const verificationToken = crypto.randomBytes(20).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 นาที

    // ตรวจสอบอีเมลซ้ำ
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      if (existingUser.isVerified) {
        return res.status(400).json({
          message: "อีเมลนี้ถูกใช้งานแล้ว",
          suggestion: "หากลืมรหัสผ่าน กรุณาไปที่หน้า Forgot Password",
        });
      } else {
        // อัปเดตข้อมูลผู้ใช้เดิมที่ยังไม่ verify
        existingUser.firstName = firstName;
        existingUser.lastName = lastName;
        existingUser.password = password;
        existingUser.gender = gender;
        existingUser.verificationToken = verificationToken;
        existingUser.verificationTokenExpires = verificationTokenExpires;
        await existingUser.save();
      }
    } else {
      // สร้างผู้ใช้ใหม่ลง Database โดยที่ยังไม่ verify
      await User.create({
        firstName,
        lastName,
        email,
        password,
        gender,
        role: "user",
        isVerified: false,
        verificationToken,
        verificationTokenExpires
      });
    }

    // สร้างลิงก์ยืนยัน
    const frontendUrl = process.env.CORS_ORIGIN || "http://localhost:5173";
    const verificationLink = `${frontendUrl}/verify-email?token=${verificationToken}`;

    // เตรียมส่งอีเมล
    const mailOptions = {
      from: process.env.EMAIL_VERIFY_USER,
      to: email,
      subject: "ยืนยันเพื่อเข้าใช้งานระบบ MoodLocationFinder",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">ยินดีต้อนรับสู่ MoodLocationFinder</h2>
          <p>ขอบคุณสำหรับการสมัครสมาชิก กรุณาคลิกที่ปุ่มด้านล่างเพื่อยืนยันอีเมลและสร้างบัญชีของคุณ:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" style="padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">ยืนยันเพื่อเข้าใช้งานระบบ moodlocation</a>
          </div>
          <p style="color: #666; font-size: 14px;">(ลิงก์นี้จะหมดอายุภายใน 15 นาที)</p>
          <p style="color: #888; font-size: 12px; margin-top: 30px;">หากคุณไม่ได้ทำการสมัครสมาชิก กรุณาละเว้นอีเมลฉบับนี้</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      message: "ระบบได้ส่งลิงก์ยืนยันไปยังอีเมลของคุณแล้ว กรุณาตรวจสอบอีเมลของคุณ",
    });
  } catch (error) {
    // Sequelize validation errors
    if (error.name === "SequelizeValidationError") {
      const messages = error.errors.map((e) => e.message);
      return res.status(400).json({ message: messages.join(", ") });
    }
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        message: "อีเมลนี้ถูกใช้งานแล้ว",
        suggestion: "หากลืมรหัสผ่าน กรุณาไปที่หน้า Forgot Password",
      });
    }
    console.error("Register error:", error);
    res
      .status(500)
      .json({ message: "เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง" });
  }
};

// ========== UC2: เข้าสู่ระบบ ==========
// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "กรุณากรอกอีเมลและรหัสผ่าน" });
    }

    // ค้นหาผู้ใช้
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    }

    // ตรวจสอบการยืนยันอีเมล
    if (user.isVerified === false) {
      return res.status(403).json({ message: "กรุณายืนยันอีเมลของคุณก่อนเข้าสู่ระบบ หากไม่พบอีเมลกรุณาสมัครใหม่อีกครั้ง" });
    }

    // ตรวจสอบสถานะ
    if (user.status === "banned") {
      if (user.bannedUntil && new Date() > user.bannedUntil) {
        // สิ้นสุดระยะเวลาการระงับ ให้ใช้งานได้ตามปกติ
        user.status = "active";
        user.bannedUntil = null;
        await user.save();
      } else {
        const untilMsg = user.bannedUntil 
          ? ` ถึงวันที่ ${new Date(user.bannedUntil).toLocaleString('th-TH')} ` 
          : 'ถาวร ';
        return res
          .status(403)
          .json({
            message: `บัญชีของคุณถูกระงับการใช้งาน${untilMsg}กรุณาติดต่อผู้ดูแลระบบ`,
          });
      }
    }

    // ตรวจสอบรหัสผ่าน
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    }

    const token = generateToken(user.id);
    
    // อัปเดต sessionToken เพื่อเตะผู้ใช้เดิมออกเมื่อล็อกอินใหม่ (Single Session)
    user.sessionToken = token;
    await user.save();

    // เตะเครื่องเก่าผ่าน Socket.IO แบบ Real-time ทันที
    const oldSocketId = getReceiverSocketId(String(user.id)) || getReceiverSocketId(user.id);
    if (oldSocketId) {
      io.to(oldSocketId).emit("force_logout", {
        message: "บัญชีนี้มีการเข้าสู่ระบบจากอุปกรณ์อื่น ระบบจะบังคับออกจากระบบ",
      });
    }

    res.json({
      message: "ยินดีต้อนรับกลับมา",
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        gender: user.gender,
        role: user.role,
        profileImage: user.profileImage,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res
      .status(500)
      .json({
        message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง",
      });
  }
};

// ========== ดึงข้อมูลผู้ใช้ปัจจุบัน ==========
// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "ไม่พบผู้ใช้งาน" });
    }
    res.json({ user });
  } catch (error) {
    console.error("GetMe error:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในระบบ" });
  }
};

// ========== สร้าง Admin (สำหรับ Postman) ==========
// POST /api/auth/register-admin
// ไม่ต้อง login - ใช้สำหรับสร้าง admin ผ่าน Postman โดยตรง
const registerAdmin = async (req, res) => {
  try {
    const { firstName, lastName, email, password, gender } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!firstName || !lastName || !email || !password || !gender) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบทุกช่อง" });
    }

    // ตรวจสอบรหัสผ่านขั้นต่ำ 6 ตัว
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" });
    }

    // ตรวจสอบอีเมลซ้ำ
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        message: "อีเมลนี้ถูกใช้งานแล้ว",
      });
    }

    // สร้าง Admin user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      gender,
      role: "admin",
      status: "active",
      isVerified: true,
    });

    res.status(201).json({
      message: "สร้าง Admin สำเร็จ",
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        gender: user.gender,
        role: user.role,
      },
    });
  } catch (error) {
    // Sequelize validation errors
    if (error.name === "SequelizeValidationError") {
      const messages = error.errors.map((e) => e.message);
      return res.status(400).json({ message: messages.join(", ") });
    }
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        message: "อีเมลนี้ถูกใช้งานแล้ว",
      });
    }
    console.error("RegisterAdmin error:", error);
    res
      .status(500)
      .json({ message: "เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง" });
  }
};

// ========== ออกจากระบบ ==========
// POST /api/auth/logout
const logout = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (user) {
      user.sessionToken = null; // เคลียร์ sessionToken
      await user.save();
    }
    res.json({ message: "ออกจากระบบสำเร็จ" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการออกจากระบบ" });
  }
};

// ========== ยืนยันอีเมลเพื่อสร้างบัญชี ==========
// GET /api/auth/verify-email/:token หรือ POST /api/auth/verify-email
const verifyEmail = async (req, res) => {
  try {
    const token = req.params.token || req.body.token;
    if (!token) {
      return res.status(400).json({ message: "ไม่พบ Token ยืนยันตัวตน" });
    }

    const user = await User.findOne({ 
      where: { 
        verificationToken: token,
        verificationTokenExpires: { [Op.gt]: new Date() } 
      } 
    });

    if (!user) {
      return res.status(400).json({ message: "Token ไม่ถูกต้องหรือหมดอายุแล้ว กรุณาสมัครสมาชิกใหม่อีกครั้ง" });
    }

    user.isVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpires = null;
    await user.save();

    res.status(200).json({
      message: "ยืนยันอีเมลสำเร็จแล้ว! คุณสามารถเข้าสู่ระบบได้",
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        gender: user.gender,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Verify email error:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการยืนยันอีเมล" });
  }
};

module.exports = { register, login, getMe, registerAdmin, logout, verifyEmail };
