const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // ใช้ URL จาก .env หรือค่า Default
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/moodlocation');
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1); // ปิดเซิร์ฟเวอร์ถ้าเชื่อมต่อไม่ได้
  }
};

module.exports = connectDB;