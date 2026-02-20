const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, minLength: 6 },
  gender: { 
    type: String, 
    enum: ["male", "female", "other", "not-specified"], 
    default: "not-specified" 
  },
  age: { type: Number, min: 1 },
  profileImage: { type: String, default: "" },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  status: { type: String, enum: ["active", "suspended", "banned"], default: "active" },
  createdAt: { type: Date, default: Date.now },
});

// --- Middleware สำหรับ Hash รหัสผ่านก่อนเซฟ ---
userSchema.pre("save", async function () {
  // หากรหัสผ่านไม่มีการเปลี่ยนแปลง ให้หยุดการทำงานทันที
  if (!this.isModified("password")) return;

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    // ใน Mongoose เวอร์ชันใหม่ ถ้าใช้ async function ไม่จำเป็นต้องเรียก next()
  } catch (err) {
    throw err;
  }
});

// Method สำหรับตรวจสอบรหัสผ่านตอน Login
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);