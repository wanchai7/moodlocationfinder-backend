const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { connectDB } = require('./config/db');
const { sequelize } = require('./models');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const placeRoutes = require('./routes/placeRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const historyRoutes = require('./routes/historyRoutes');
const userRoutes = require('./routes/userRoutes');
const contactRoutes = require('./routes/contactRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (สำหรับรูปภาพที่ upload)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ========== Routes (v1) ==========
app.use('/api/v1/auth', authRoutes);          // UC1, UC2
app.use('/api/v1/places', placeRoutes);       // UC3, UC4, UC6
app.use('/api/v1/reviews', reviewRoutes);     // UC7
app.use('/api/v1/favorites', favoriteRoutes); // UC8
app.use('/api/v1/history', historyRoutes);    // UC9
app.use('/api/v1/users', userRoutes);         // UC10
app.use('/api/v1/contact', contactRoutes);    // UC11
app.use('/api/v1/admin', adminRoutes);        // UC12, UC13, UC14

// Health check
app.get('/', (req, res) => {
    res.json({
        message: '🎭 Mood & Place API is running!',
        version: '1.0.0',
        endpoints: {
            auth: '/api/v1/auth',
            places: '/api/v1/places',
            reviews: '/api/v1/reviews',
            favorites: '/api/v1/favorites',
            history: '/api/v1/history',
            users: '/api/v1/users',
            contact: '/api/v1/contact',
            admin: '/api/v1/admin'
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server Error:', err);

    // Multer file size error
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            message: 'ไฟล์รูปต้องไม่เกิน 2MB',
            detail: `ไฟล์ของคุณมีขนาดเกินกำหนด กรุณาลองย่อรูปก่อน`
        });
    }

    // Multer file filter error
    if (err.message && err.message.includes('อนุญาตเฉพาะไฟล์รูปภาพ')) {
        return res.status(400).json({ message: err.message });
    }

    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'ไม่พบ API endpoint ที่ร้องขอ' });
});

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();

        // Sync database (สร้าง tables อัตโนมัติ)
        await sequelize.sync({ alter: true });
        console.log('✅ Database synced successfully');

        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📡 API: http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('❌ ไม่สามรถเชื่อมต่อฐานข้อมูล PostgreSQL:', error);
        process.exit(1);
    }
};

startServer();
