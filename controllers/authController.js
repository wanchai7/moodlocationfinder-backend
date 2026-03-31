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
const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, gender } = req.body;

    if (!firstName || !lastName || !email || !password || !gender) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบทุกช่อง" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        message: "อีเมลนี้ถูกใช้งานแล้ว",
        suggestion: "หากลืมรหัสผ่าน กรุณาไปที่หน้า Forgot Password",
      });
    }

    const verificationToken = jwt.sign(
      { firstName, lastName, email, password, gender },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    let verificationLink = "";
    if (!req.headers.origin) {
      const port = process.env.PORT || 5000;
      verificationLink = `http://localhost:${port}/api/v1/auth/verify-email/${verificationToken}`;
    } else {
      const fallbackOrigin = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',')[0].trim() : "http://localhost:5173";
      const frontendUrl = req.headers.origin || fallbackOrigin;
      verificationLink = `${frontendUrl}/verify-email?token=${verificationToken}`;
    }

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
    res.status(500).json({ message: "เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง" });
  }
};

// ========== UC2: เข้าสู่ระบบ ==========
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "กรุณากรอกอีเมลและรหัสผ่าน" });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    }

    if (user.status === "banned") {
      if (user.bannedUntil && new Date() > user.bannedUntil) {
        user.status = "active";
        user.bannedUntil = null;
        await user.save();
      } else {
        const untilMsg = user.bannedUntil 
          ? ` ถึงวันที่ ${new Date(user.bannedUntil).toLocaleString('th-TH')} ` 
          : 'ถาวร ';
        return res.status(403).json({
            message: `บัญชีของคุณถูกระงับการใช้งาน${untilMsg}กรุณาติดต่อผู้ดูแลระบบ`,
          });
      }
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    }

    const token = generateToken(user.id);
    
    user.sessionToken = token;
    await user.save();

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
    res.status(500).json({
        message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง",
      });
  }
};

// ========== ดึงข้อมูลผู้ใช้ปัจจุบัน ==========
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
const registerAdmin = async (req, res) => {
  try {
    const { firstName, lastName, email, password, gender } = req.body;

    if (!firstName || !lastName || !email || !password || !gender) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบทุกช่อง" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        message: "อีเมลนี้ถูกใช้งานแล้ว",
      });
    }

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
    res.status(500).json({ message: "เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง" });
  }
};

// ========== ออกจากระบบ ==========
const logout = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (user) {
      user.sessionToken = null;
      await user.save();
    }
    res.json({ message: "ออกจากระบบสำเร็จ" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการออกจากระบบ" });
  }
};

// ========== ยืนยันอีเมลเพื่อสร้างบัญชี ==========
const verifyEmail = async (req, res) => {
    try {
        const token = req.params.token || req.body.token;

        if (!token) {
             if (req.method === 'GET') {
                 return res.status(400).send(`<h2>❌ ไม่พบ Token ลิงก์ไม่ถูกต้อง</h2>`);
             }
             return res.status(400).json({ message: "ไม่พบ Token" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { firstName, lastName, email, password, gender } = decoded;

        // Check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
             if (req.method === 'GET') {
                  return res.send(`
                      <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
                          <h2 style="color: #4CAF50;">✅ อีเมลนี้ถูกยืนยันไปแล้ว</h2>
                          <p>คุณสามารถปิดหน้านี้และไปเข้าสู่ระบบได้เลย</p>
                      </div>
                  `);
             }
             return res.status(400).json({ message: "อีเมลนี้ถูกใช้งานแล้ว" });
        }

        // Create new user
        await User.create({ firstName, lastName, email, password, gender, status: "active" });

        if (req.method === 'GET') {
              return res.send(`
                  <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
                      <h2 style="color: #4CAF50;">✅ ยืนยันอีเมลสำเร็จ!</h2>
                      <p>บัญชีของคุณถูกสร้างเรียบร้อยแล้ว คุณสามารถเข้าสู่ระบบและใช้งานได้ทันที</p>
                  </div>
              `);
        }
        res.status(201).json({ message: "ยืนยันอีเมลสำเร็จและสร้างบัญชีเรียบร้อย" });

    } catch (error) {
        if (req.method === 'GET') {
             return res.send(`
                 <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
                     <h2 style="color: #F44336;">❌ ลิงก์ยืนยันไม่ถูกต้องหรือหมดอายุ</h2>
                     <p>กรุณาสมัครสมาชิกใหม่อีกครั้ง</p>
                 </div>
             `);
        }
        return res.status(400).json({ message: "Token ไม่ถูกต้องหรือหมดอายุ" });
    }
};

// ========== ลืมรหัสผ่าน (ขอรีเซ็ต) ==========
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: "กรุณากรอกอีเมล" });
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: "ไม่พบอีเมลนี้ในระบบ" });
        }

        // สร้าง token สำหรับรีเซ็ต
        const resetToken = crypto.randomBytes(32).toString("hex");
        
        // แฮช token และบันทึกในฐานข้อมูลพร้อมเวลาหมดอายุ (15 นาที)
        user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
        user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
        await user.save();

        let resetUrl = "";
        const port = process.env.PORT || 5000;
        resetUrl = `http://localhost:${port}/api/v1/auth/reset-password/${resetToken}`;
        
        if (process.env.NODE_ENV === "production" || (req.headers.host && req.headers.host.includes("vercel"))) {
            resetUrl = `https://moodlocationproject-api.vercel.app/api/v1/auth/reset-password/${resetToken}`;
        }

        const mailOptions = {
            from: process.env.EMAIL_VERIFY_USER,
            to: email,
            subject: "คำขอเปลี่ยนรหัสผ่าน MoodLocationFinder",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #333;">คุณได้ขอเปลี่ยนรหัสผ่าน</h2>
                    <p>กรุณาคลิกที่ปุ่มด้านล่างเพื่อทำการตั้งรหัสผ่านใหม่:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" style="padding: 12px 24px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">ตั้งรหัสผ่านใหม่</a>
                    </div>
                    <p style="color: #666; font-size: 14px;">(ลิงก์นี้จะหมดอายุภายใน 15 นาที)</p>
                    <p style="color: #888; font-size: 12px; margin-top: 30px;">หากคุณไม่ได้ทำการขอเปลี่ยนรหัสผ่าน กรุณาละเว้นอีเมลฉบับนี้</p>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);
        
        res.status(200).json({ message: "ระบบได้ส่งลิงก์เปลี่ยนรหัสผ่านไปยังอีเมลของคุณแล้ว" });

    } catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการส่งอีเมล" });
    }
};

// ========== หน้าเว็บรีเซ็ตรหัสผ่าน (แสดง UI จาก Backend) ==========
const getResetPasswordPage = async (req, res) => {
    try {
        const { token } = req.params;
        
        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
        const user = await User.findOne({
            where: {
                resetPasswordToken: hashedToken,
                resetPasswordExpires: { [Op.gt]: Date.now() }
            }
        });

        if (!user) {
            return res.send(`
                <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
                    <h2 style="color: #F44336;">❌ ลิงก์ไม่ถูกต้องหรือหมดอายุแล้ว</h2>
                    <p>กรุณาขอลิงก์เปลี่ยนรหัสผ่านใหม่อีกครั้ง</p>
                </div>
            `);
        }

        res.send(`
            <!DOCTYPE html>
            <html lang="th">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>ตั้งรหัสผ่านใหม่ - MoodLocationFinder</title>
                <style>
                    body { font-family: 'Sarabun', Arial, sans-serif; background-color: #f5f5f5; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                    .container { background-color: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); width: 100%; max-width: 400px; }
                    h2 { text-align: center; color: #333; margin-top: 0; }
                    .form-group { margin-bottom: 20px; }
                    label { display: block; margin-bottom: 8px; color: #555; }
                    input { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box; font-size: 16px; }
                    input:focus { border-color: #2196F3; outline: none; }
                    button { width: 100%; padding: 14px; background-color: #2196F3; color: white; border: none; border-radius: 5px; font-size: 16px; cursor: pointer; font-weight: bold; transition: background-color 0.3s; }
                    button:hover { background-color: #0b7dda; }
                    .message { margin-top: 15px; text-align: center; padding: 10px; border-radius: 5px; display: none; }
                    .error { background-color: #fde5e5; color: #d32f2f; display: block; }
                    .success { background-color: #e8f5e9; color: #2e7d32; display: block; }
                </style>
            </head>
            <body>
                <div class="container" id="form-container">
                    <h2>ตั้งรหัสผ่านใหม่</h2>
                    <form id="reset-form">
                        <div class="form-group">
                            <label for="password">รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)</label>
                            <input type="password" id="password" required>
                        </div>
                        <div class="form-group">
                            <label for="confirmPassword">ยืนยันรหัสผ่านใหม่</label>
                            <input type="password" id="confirmPassword" required>
                        </div>
                        <button type="submit" id="submit-btn">บันทึกรหัสผ่านใหม่</button>
                        <div id="message" class="message"></div>
                    </form>
                </div>
                <script>
                    document.getElementById('reset-form').addEventListener('submit', async (e) => {
                        e.preventDefault();
                        const password = document.getElementById('password').value;
                        const confirmPassword = document.getElementById('confirmPassword').value;
                        const messageEl = document.getElementById('message');
                        const btn = document.getElementById('submit-btn');

                        if (password !== confirmPassword) {
                            messageEl.textContent = "รหัสผ่านไม่ตรงกัน กรุณาลองใหม่";
                            messageEl.className = "message error";
                            return;
                        }

                        if (password.length < 6) {
                            messageEl.textContent = "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร";
                            messageEl.className = "message error";
                            return;
                        }

                        btn.disabled = true;
                        btn.textContent = "กำลังบันทึก...";

                        try {
                            const response = await fetch('/api/v1/auth/reset-password/${token}', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ newPassword: password, confirmPassword: confirmPassword })
                            });

                            const data = await response.json();

                            if (response.ok) {
                                document.getElementById('form-container').innerHTML = \`
                                    <div style="text-align: center;">
                                        <h2 style="color: #4CAF50;">✅ เปลี่ยนรหัสผ่านสำเร็จ</h2>
                                        <p style="color: #666; margin-top: 15px;">รหัสผ่านของคุณถูกเปลี่ยนเรียบร้อยแล้ว</p>
                                        <p style="color: #666;">คุณสามารถปิดหน้านี้และกลับไปเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที</p>
                                    </div>
                                \`;
                            } else {
                                messageEl.textContent = data.message || "เกิดข้อผิดพลาด กรุณาลองใหม่";
                                messageEl.className = "message error";
                                btn.disabled = false;
                                btn.textContent = "บันทึกรหัสผ่านใหม่";
                            }
                        } catch (err) {
                            messageEl.textContent = "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่";
                            messageEl.className = "message error";
                            btn.disabled = false;
                            btn.textContent = "บันทึกรหัสผ่านใหม่";
                        }
                    });
                </script>
            </body>
            </html>
        `);
    } catch (error) {
        console.error("Get reset password page error:", error);
        res.status(500).send("เกิดข้อผิดพลาดในระบบ");
    }
};

// ========== ดำเนินการเปลี่ยนรหัสผ่าน ==========
const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { newPassword, confirmPassword } = req.body;

        if (!newPassword || !confirmPassword) {
            return res.status(400).json({ message: "กรุณากรอกรหัสผ่านให้ครบถ้วน" });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: "รหัสผ่านไม่ตรงกัน" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" });
        }

        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

        const user = await User.findOne({
            where: {
                resetPasswordToken: hashedToken,
                resetPasswordExpires: { [Op.gt]: Date.now() }
            }
        });

        if (!user) {
            return res.status(400).json({ message: "ลิงก์ไม่ถูกต้องหรือหมดอายุแล้ว" });
        }

        user.password = newPassword; 
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        user.sessionToken = null;
        
        await user.save();

        let oldSocketId = await getReceiverSocketId(String(user.id));
        if (!oldSocketId) {
            oldSocketId = await getReceiverSocketId(user.id);
        }
        if (oldSocketId) {
          io.to(oldSocketId).emit("force_logout", {
            message: "รหัสผ่านของคุณถูกเปลี่ยนแปลง ระบบจะบังคับออกจากระบบ",
          });
        }

        res.status(200).json({ message: "ตั้งรหัสผ่านใหม่สำเร็จ สามารถเข้าสู่ระบบได้ทันที" });

    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน" });
    }
};

module.exports = { register, login, getMe, registerAdmin, logout, verifyEmail, forgotPassword, getResetPasswordPage, resetPassword };
