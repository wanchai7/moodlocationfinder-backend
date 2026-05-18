const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { Op } = require("sequelize");
const { User } = require("../models");
const { io, getReceiverSocketId } = require("../lib/socket");

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

    // ตรวจสอบอีเมลซ้ำ
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        message: "อีเมลนี้ถูกใช้งานแล้ว",
        suggestion: "หากลืมรหัสผ่าน กรุณาไปที่หน้า Forgot Password",
      });
    }

    // สร้าง User
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      gender,
      role: "user",
      verificationToken,
      isVerified: false
    });

    // ส่งอีเมลยืนยัน
    const { sendVerificationEmail } = require('../utils/email');
    await sendVerificationEmail(email, verificationToken);

    return res.status(201).json({
      message: "สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลของคุณเพื่อยืนยันบัญชี",
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
      return res.status(400).json({ message: "กรุณากรอกอีเมล/ชื่อผู้ใช้ และรหัสผ่าน" });
    }

    // ค้นหาผู้ใช้จากอีเมลหรือชื่อ
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: email },
          { firstName: email }
        ]
      }
    });

    if (!user) {
      return res.status(401).json({ message: "อีเมล/ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง" });
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

    // ตรวจสอบการยืนยันอีเมล
    if (user.role === 'user' && !user.isVerified) {
       return res.status(403).json({ message: "กรุณายืนยันอีเมลของคุณก่อนเข้าสู่ระบบ" });
    }

    const token = generateToken(user.id);
    
    // อัปเดต sessionToken เพื่อเตะผู้ใช้เดิมออกเมื่อล็อกอินใหม่ (Single Session)
    user.sessionToken = token;
    await user.save();

    // เตะเครื่องเก่าผ่าน Socket.IO แบบ Real-time ทันที (รองรับ Redis)
    let oldSocketId = await getReceiverSocketId(String(user.id));
    if (!oldSocketId) {
        oldSocketId = await getReceiverSocketId(user.id);
    }
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

// ========== ยืนยันอีเมล ==========
// GET /api/auth/verify-email/:token
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({ where: { verificationToken: token } });
    
    if (!user) {
      return res.status(400).json({ message: "ลิงก์ยืนยันไม่ถูกต้องหรือหมดอายุแล้ว" });
    }

    user.isVerified = true;
    user.verificationToken = null;
    await user.save();

    res.json({ message: "ยืนยันอีเมลสำเร็จ สามารถเข้าสู่ระบบได้" });
  } catch (error) {
    console.error("Verify email error:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการยืนยันอีเมล" });
  }
};

module.exports = { register, login, getMe, registerAdmin, logout, verifyEmail };
