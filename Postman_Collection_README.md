# Mood Location Finder API - Postman Collection

ไฟล์ Postman Collection สำหรับทดสอบ API ของ Mood Location Finder Backend

## วิธีการใช้งาน

1. ดาวน์โหลดไฟล์ `MoodLocationFinder_Postman_Collection.json`
2. เปิด Postman และเลือก "Import"
3. เลือกไฟล์ที่ดาวน์โหลดมา
4. ตั้งค่า Environment Variables:
   - `base_url`: URL ของเซิร์ฟเวอร์ (default: `http://localhost:5000`)
   - `token`: JWT Token (จะถูกตั้งค่าโดยอัตโนมัติหลังจาก login สำเร็จ)
   - `user_id`: ID ของผู้ใช้ (จะถูกตั้งค่าโดยอัตโนมัติหลังจาก login สำเร็จ)
   - `place_id`: ID ของสถานที่ (ต้องตั้งค่าเอง)

## ลำดับการทดสอบ API

### 1. Authentication (ไม่ต้อง login)
- **Register User**: สมัครสมาชิกใหม่
- **Verify Email**: ยืนยันอีเมล (ใช้หลังจาก register)
- **Login**: เข้าสู่ระบบ (token จะถูกเก็บไว้ใน environment variable)
- **Register Admin**: สร้างบัญชี admin

### 2. Places (ไม่ต้อง login)
- **Get All Moods**: ดูอารมณ์ทั้งหมด
- **Get Places by Mood**: ค้นหาสถานที่ตามอารมณ์
- **Search Places by Mood Text**: ค้นหาสถานที่ด้วยข้อความอารมณ์
- **Get Places by Category**: ค้นหาสถานที่ตามหมวดหมู่
- **Get All Places**: ดูสถานที่ทั้งหมด
- **Get Place by ID**: ดูรายละเอียดสถานที่

### 3. Reviews (ต้อง login ก่อน)
- **Create Review**: เขียนรีวิวสถานที่
- **Get Reviews by Place**: ดูรีวิวของสถานที่
- **Delete Review**: ลบรีวิว

### 4. Favorites (ต้อง login ก่อน)
- **Toggle Favorite**: เพิ่ม/ลบสถานที่โปรด
- **Get Favorites**: ดูสถานที่โปรด
- **Check Favorite**: ตรวจสอบว่าสถานที่เป็นโปรดหรือไม่

### 5. History (ต้อง login ก่อน)
- **Get History**: ดูประวัติการเดินทาง
- **Create History**: บันทึกประวัติการเดินทาง
- **Delete History**: ลบประวัติ

### 6. Users (ต้อง login ก่อน)
- **Update Profile**: แก้ไขโปรไฟล์ (รองรับอัปโหลดรูป)
- **Change Password**: เปลี่ยนรหัสผ่าน

### 7. Admin (ต้อง login แบบ admin ก่อน)
- **Create Place**: สร้างสถานที่ใหม่
- **Update Place**: แก้ไขสถานที่
- **Update Place Moods**: แก้ไขอารมณ์ของสถานที่
- **Delete Place**: ลบสถานที่
- **Get All Users**: ดูผู้ใช้ทั้งหมด
- **Ban User**: แบนผู้ใช้
- **Unban User**: ยกเลิกการแบน
- **Suspend User**: สั่งพักผู้ใช้
- **Delete User**: ลบผู้ใช้

### 8. Messages (ต้อง login ก่อน)
- **Get Users for Sidebar**: ดูผู้ใช้สำหรับแชท
- **Get Messages**: ดูข้อความ
- **Send Message**: ส่งข้อความ
- **Mark Messages as Read**: ทำเครื่องหมายว่าอ่านแล้ว

### 9. AI (ไม่ต้อง login)
- **Analyze Emotion**: วิเคราะห์อารมณ์จากข้อความ

### 10. Maps (ไม่ต้อง login)
- **Search Nearby Places**: ค้นหาสถานที่ใกล้เคียง
- **Get Place Details**: ดูรายละเอียดสถานที่จาก Google Maps

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `base_url` | URL ของ API server | `http://localhost:3000` |
| `token` | JWT authentication token | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `user_id` | ID ของผู้ใช้ปัจจุบัน | `123` |
| `place_id` | ID ของสถานที่ที่ต้องการทดสอบ | `456` |

## หมายเหตุ

- API บางส่วนต้องมีการ authentication (มี Bearer token ใน header)
- สำหรับการอัปโหลดไฟล์ ให้เลือกไฟล์ในส่วน form-data
- Array fields (เช่น moods, personality) ส่งเป็น JSON string
- Token จะหมดอายุใน 30 นาที หลังจากนั้นต้อง login ใหม่