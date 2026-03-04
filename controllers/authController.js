const jwt = require('jsonwebtoken');
const { User } = require('../models');

// สร้าง JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// ========== UC1: สมัครสมาชิก ==========
// POST /api/auth/register
const register = async (req, res) => {
    try {
        const { firstName, lastName, email, password, gender, role } = req.body;

        // ตรวจสอบข้อมูลที่จำเป็น
        if (!firstName || !lastName || !email || !password || !gender) {
            return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบทุกช่อง' });
        }

        // ตรวจสอบรหัสผ่านขั้นต่ำ 6 ตัว
        if (password.length < 6) {
            return res.status(400).json({ message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
        }

        // ตรวจสอบอีเมลซ้ำ
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({
                message: 'อีเมลนี้ถูกใช้งานแล้ว',
                suggestion: 'หากลืมรหัสผ่าน กรุณาไปที่หน้า Forgot Password'
            });
        }

        // สร้างผู้ใช้ใหม่
        const user = await User.create({
            firstName,
            lastName,
            email,
            password,
            gender,
            role: role || 'user'
        });

        res.status(201).json({
            message: 'สมัครสมาชิกสำเร็จ',
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                gender: user.gender,
                role: user.role
            }
        });
    } catch (error) {
        // Sequelize validation errors
        if (error.name === 'SequelizeValidationError') {
            const messages = error.errors.map(e => e.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({
                message: 'อีเมลนี้ถูกใช้งานแล้ว',
                suggestion: 'หากลืมรหัสผ่าน กรุณาไปที่หน้า Forgot Password'
            });
        }
        console.error('Register error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง' });
    }
};

// ========== UC2: เข้าสู่ระบบ ==========
// POST /api/auth/login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'กรุณากรอกอีเมลและรหัสผ่าน' });
        }

        // ค้นหาผู้ใช้
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        }

        // ตรวจสอบสถานะ
        if (user.status === 'banned') {
            return res.status(403).json({ message: 'บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ' });
        }

        // ตรวจสอบรหัสผ่าน
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        }

        const token = generateToken(user.id);

        res.json({
            message: 'ยินดีต้อนรับกลับมา',
            token,
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                gender: user.gender,
                role: user.role,
                profileImage: user.profileImage,
                status: user.status
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง' });
    }
};

// ========== ดึงข้อมูลผู้ใช้ปัจจุบัน ==========
// GET /api/auth/me
const getMe = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });
        }
        res.json({ user });
    } catch (error) {
        console.error('GetMe error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
    }
};

module.exports = { register, login, getMe };
