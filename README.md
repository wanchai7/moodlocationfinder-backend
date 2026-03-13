# คู่มือทำความเข้าใจระบบ Backend (Mood Location Finder)

เอกสารนี้จะอธิบายโครงสร้างและการทำงานของทุกไฟล์และทุกฟังก์ชันในระบบ Backend ของโปรเจกต์ Mood Location Finder อย่างละเอียด เพื่อให้ง่ายต่อการอ่านและทำความเข้าใจการทำงานทั้งหมด

---

## 📂 โครงสร้างโฟลเดอร์และไฟล์ (Folder Structure)

ระบบ Backend ถูกแบ่งโฟลเดอร์ตามสถาปัตยกรรมแบบ MVC (Model-View-Controller) แต่ปรับให้เหมาะกับ Express.js API:

- **`config/`**: เก็บการตั้งค่าตัวแปร การเชื่อมต่อภายนอก (Database, Cloudinary)
- **`controllers/`**: เก็บ Logics การทำงานของแต่ละ API (แต่ละฟังก์ชันว่ารับค่าอะไร ทำอะไร ส่งค่าอะไร)
- **`lib/`**: เก็บไลบรารีหรือฟังก์ชันการตั้งค่าระบบแยก เช่น ระบบ Socket.io สำหรับแชท
- **`middleware/`**: ตัวกรองคำขอก่อนเข้าไปถึง Controller เช่น ตรวจสอบ Token, ตรวจสอบการอัปโหลดไฟล์
- **`models/`**: โครงสร้างข้อมูลตารางในฐานข้อมูล PostgreSQL (ใช้ Sequelize ORM)
- **`routes/`**: กำหนด URL Paths ของ API และเชื่อมกับ Controller ที่เกี่ยวข้อง
- **`uploads/`**: โฟลเดอร์สำหรับเก็บไฟล์รูปภาพที่อัปโหลดเข้าเซิร์ฟเวอร์ชั่วคราว (ก่อนส่งขึ้น Cloudinary หรือใช้งานแบบ local)
- **`server.js`**: ไฟล์จุดเริ่มต้นของระบบที่ตั้งค่า Express, CORS, Static Files และเส้นทาง (Routes) ทั้งหมด
- **`Dockerfile` / `docker-compose.yml`**: สำหรับการติดตั้งระบบผ่าน Docker

---

## 🚀 1. จุดเริ่มต้นระบบ (Entry Points)

### 📄 `server.js`

- **หน้าที่**: เป็นไฟล์หลักสำหรับเริ่ม Server โหลดตัวแปรสภาพแวดล้อม (`.env`) ตั้งค่า Express, CORS และเชื่อมต่อฐานข้อมูล
- **การทำงาน**:
  - ดึงค่า CORS จาก `.env` เพื่ออนุญาตให้ Frontend เรียกใช้ API ได้
  - สร้าง /uploads ให้เป็น Static Path เข้าถึงผ่าน URL ได้
  - ประกาศ API Routes ต่างๆ เช่น `/api/v1/auth`, `/api/v1/places`
  - ทำการ Sync Database กับตารางใน `models` ทุกครั้งที่รัน
  - รัน `app.listen()` หรือผ่าน Server ของ `lib/socket.js` เพื่อเริ่มให้บริการ
- **Error Handling**: มี Middleware จัดการ Error จาก Multer (เช่น ไฟล์ขนาดเกิน 2MB หรือไม่ใช่รูป) ส่งกลับเป็น 400 Bad Request

### 📄 `lib/socket.js`

- **หน้าที่**: ตั้งค่าเซิร์ฟเวอร์ Socket.IO เพื่อใช้ในระบบแชทแบบ Real-time
- **การทำงาน**:
  - สร้าง `userSocketMap` เพื่อแมป `userId` กับ `socketId` ของผู้ที่ออนไลน์
  - เมื่อเชื่อมต่อ (`connection`): บันทึก `socketId` และส่งรายชื่อคนออนไลน์ (`getOnlineUsers`) ให้ทุกคน
  - เมื่อตัดการเชื่อมต่อ (`disconnect`): ลบ `socketId` และอัปเดตคนออนไลน์
  - มีฟังก์ชัน `getReceiverSocketId(userId)` ใช้ดึง `socketId` เอาไว้ให้ Controller ส่งแชทข้ามหากันได้

---

## ⚙️ 2. การตั้งค่าระบบ (Config)

### 📄 `config/db.js`

- **หน้าที่**: จัดการการเชื่อมต่อกับฐานข้อมูล PostgreSQL ผ่าน Sequelize
- **การทำงาน**:
  - สร้าง Instance ของ Sequelize โดยตรวจเช็คว่าถ้ามีตัวแปร `DATABASE_URL` ให้เชื่อมต่อแบบ Production/Render (มีตั้งค่า SSL)
  - ถ้าไม่มี จะใช้ตัวแปร ENV แบบแยกส่วน (DB_NAME, DB_USER, DB_HOST ฯลฯ) สำหรับ Local หรือ Docker

### 📄 `config/cloudinary.js`

- **หน้าที่**: ตั้งค่าการเชื่อมต่อกับบริการจัดเก็บรูปภาพ Cloudinary
- **ดึงค่าจาก**: `.env` (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`)

---

## 🛡️ 3. มิดเดิลแวร์ (Middleware)

### 📄 `middleware/authMiddleware.js`

- **ฟังก์ชัน `protect`**:
  - **หน้าที่**: ตรวจสอบผู้ใช้ว่าได้ Login มี Token หรือไม่
  - **เงื่อนไข**: รับ Header `Authorization: Bearer <token>`
  - **Error**: คืน 401 ถ้าไม่มี Token หรือ Token หมดอายุ, คืน 403 ถ้า Account ถูกตรวจสอบพบว่าสถานะเป็น `banned`
  - **การใช้งาน**: ใช้คู่กับ Route ที่ต้อง Login เช่น อัปเดตโปรไฟล์, เพิ่มรายการโปรด
- **ฟังก์ชัน `adminOnly`**:
  - **หน้าที่**: ตรวจสอบว่าเป็น Admin หรือไม่
  - **เงื่อนไข**: ตรวจสอบ `req.user.role === 'admin'` จำเป็นต้องผ่าน `protect` ก่อน
  - **Error**: คืน 403 เฉพาะผู้ดูแลระบบเท่านั้น

### 📄 `middleware/uploadMiddleware.js`

- **หน้าที่**: จัดการการรับไฟล์ภาพ (Multer) ที่แนบมาจากฟอร์ม (Form-Data)
- **เงื่อนไข**: สร้างชื่อไฟล์ใหม่เป็น Unix Timestamp + Random, จำกัดเฉพาะนามสกุล `.jpeg, .jpg, .png, .gif, .webp`, และขนาดไฟล์ต้องไม่เกิน 2MB
- **Error**: แจ้ง Error หากนามสกุลไม่ใช่รูปภาพ หรือขนาดเกิน 2MB (ส่งต่อ Error ไปให้ `server.js` จัดการ)

---

## 🗄️ 4. โครงสร้างฐานข้อมูล (Models)

กำหนดโดย Sequelize และใช้ `models/index.js` ในการทำ Association (ความสัมพันธ์ผูกมัด)

- **`User.js`**: เก็บข้อมูลผู้ใช้ (ชื่อ สกุล อีเมล รหัสผ่าน สถานะแบน รูปโปรไฟล์) มีฟังก์ชัน `hashPassword` (เข้ารหัส) และ `matchPassword` เพื่อตรวจสอบก่อนเข้าสู่ระบบ
- **`Place.js`**: เก็บข้อมูลสถานที่ (ชื่อ หมวดหมู่ tags-อารมณ์/บุคลิก พิกัด รีวิว)
- **`Review.js`**: คอมเมนต์และให้คะแนนสถานที่ (ผูกกับ User & Place)
- **`Favorite.js`**: รายการโปรด (ผูกกับ User & Place)
- **`History.js`**: ประวัติการเข้าชม/เช็คอิน (ผูกกับ User & Place)
- **`Contact.js`**: กล่องข้อความที่ส่งหา Admin
- **`EmailLog.js`**: ประวัติบันทึกการส่งอีเมลออกจาก Admin
- **`ChatMessage.js`**: ข้อความแชท 1-1 (senderId, receiverId, text, image, isRead)
- **`models/index.js`**: สร้างความสัมพันธ์ เช่น User `hasMany` Reviews, Place `hasMany` Reviews, ฯลฯ

---

## 🧠 5. คอนโทรลเลอร์ (Controllers) - ใจความสำคัญของระบบ

ไฟล์ในส่วนนี้จะใช้กับข้อมูล `req` (คำขอ), `res` (เซิร์ฟเวอร์ตอบกลับ) ทั้งหมด

### 📄 `authController.js` (ระบบสมาชิก)

- **`register`**: สมัครสมาชิก
  - **เงื่อนไข**: รับ firstName, lastName, email, password, gender
  - **Error**: คืน 400 หากข้อมูลไม่ครบ, รหัสผ่าน < 6, หรือ Email ซ้ำ (มีอยู่แล้ว)
  - **ผลลัพธ์**: ตั้ง role เป็น user, คืนค่า user พร้อม status 201
- **`login`**: เข้าสู่ระบบ
  - **เงื่อนไข**: รับ email, password
  - **Error**: คืน 401 ถ้า email/password ผิด, คืน 403 ถ้าถูกแบน (ถ้าครบกำหนดระงับ ระบบจะปลดแบนให้เมื่อพยายามล็อคอิน)
  - **ผลลัพธ์**: ส่ง JWT Token (expires ใน 30 วัน) กลับไปให้เก็บฝั่ง Frontend
- **`getMe`**: ดึงข้อมูล Current User จาก Token ที่ฝังไว้ (`req.user.id`)
- **`registerAdmin`**: สำหรับสร้างรหัส Admin ผ่าน Postman (ข้ามเงื่อนไข Authentication ตัวหน้าบ้าน)

### 📄 `userController.js` (ผู้ใช้ปรับปรุงข้อมูล)

- **`updateProfile`**:
  - **รับค่า**: ข้อมูล firstName, lastName, gender และ/หรือ ไฟล์รูป (`req.file`)
  - **การทำงาน**: เปลี่ยนค่าชื่อ, ถ้ามีรูปจะพ่นขึ้น Cloudinary แล้วนำ URL ไปบันทึก พร้อมลบรูปเดิมและรูปชั่วคราวทิ้งอัตโนมัติ
- **`changePassword`**:
  - **เงื่อนไข**: รับรหัสเดิม (`currentPassword`), กับรหัสใหม่ (`newPassword`) (ต้อง > 6 ตัว) และเปรียบเทียบรหัสเดิม ถ้าถูกจึงบันทึกทับ

### 📄 `placeController.js` (จัดการข้อมูลสถานที่ - คนทั่วไปใช้ได้)

- **`getPlacesByMood` (UC3)**:
  - **รับค่า**: `mood` ผ่าน URL Parameters (เช่น `/api/places/mood/มีความสุข`) และ `category`, `personality` (ตัวเลือก) ทาง Query
  - **ผลลัพธ์**: ดึง Place ทั้งหมดที่มี Tag อารมณ์ตรง พร้อมหาค่าเฉลี่ยดาว Rating จากตารางรีวิว
- **`searchByMoodText` (UC4)**:
  - **เงื่อนไข**: รับ Query `q` เป็นข้อความ แล้วนำมาเทียบกับ `moodKeywords` Mapping (มี 7 อารมณ์) เพื่อแปลงข้อความผู้ใช้ -> อารมณ์
  - **ผลลัพธ์**: คืนค่าสถานที่ที่ตรงหรือคืนคำแนะนำหากจับอารมณ์ไม่ได้
- **`getPlacesByCategory` (UC6)**: ดึงตามหมวดหมู่ เช่น คาเฟ่, ธรรมชาติ
- **`getAllPlaces`** & **`getPlaceById`**: ดึงทั้งหมด และ ดึงเฉพาะ ID
- **`getAllMoods`**: ส่ง List รายชื่อ Moods เพื่อให้ Frontend ใช้เรนเดอร์

### 📄 `favoriteController.js` (รายการโปรด)

- **`toggleFavorite` (UC8)**:
  - **เงื่อนไข**: รับ `placeId` ค้นหาข้อมูล ถ้าพบว่าเคย Favorite แล้วจะ "ลบทิ้ง", ถ้ายังไม่เคยจะ "เพิ่มข้อมูลเข้า" (เป็นแบบสวิตซ์)
- **`getFavorites`**: คืน List รายการสถานที่โปรดของ User พร้อมเรตติ้ง
- **`checkFavorite`**: ส่งกลับแค่ `true`/`false` ว่าได้กดเป็นสถานที่โปรดหรือยัง ใช้ทำ UI สีหัวใจ

### 📄 `historyController.js` (ประวัติการเช็คอิน)

- **`getHistory` (UC9)**: ดึงสถานที่ ๆ เคยเช็คอิน คืนกลับเพื่อทำโชว์
- **`addHistory`**:
  - **เงื่อนไข**: รับ `placeId` ในหน้าสรุป แล้วบันทึกว่าไปมาในเวลาปัจจุบัน
- **`deleteHistory`**: ลบประวัติออกโดยผู้ใช้เอง

### 📄 `reviewController.js` (รีวิวและให้คะแนน)

- **`createReview` (UC7)**:
  - **เงื่อนไข**: รับ `placeId`, `rating` (1-5), `comment`.
  - **การทำงาน**: ถ้าผู้ใช้เคยรีวิวที่เดิมแล้ว จะอัปเดตของเก่าให้แทน แต่ถ้าไม่เคย จะเพิ่มอันใหม่
- **`getReviewsByPlace`**: ดึงรีวิวตาม ID ของสถานที่
- **`deleteReview`**:
  - **ข้อจำกัด**: คนที่จะลบได้ ต้องมารหัสเดียวกันกับคนรีวิว หรือเป็น Admin ถึงจะลบได้

### 📄 `chatController.js` (ระบบแชท 1-1 คล้าย MERN Chat)

- **`getUsersForSidebar`**: ดึงรายชื่อ User ทั้งหมดยกเว้นตัวเอง (ลดทอน Password ออก) และเพิ่มฟิลด์ค้นหา Last Message เพื่อวางเรียงด้านซ้ายสุด โดยเรียงเวลาข้อความล่าสุด
- **`getMessages`**: ดึงข้อความ 1 ต่อ 1 กรองเฉพาะ sender-receiver ที่เกี่ยวข้อง
- **`sendMessage`**:
  - **การทำงาน**: รับ `text`, `image` ถ้าเป็น Image แบบ Base64 จะอัปโหลดขึ้น Cloudinary -> สร้างข้อความลง DB -> เรียก `lib/socket.js` ค้นหา Socket ID ฝั่งปลายทางแล้วสั่ง `io.to(...).emit('newMessage')` เพื่อดันข้อมูลออก Realtime
- **`markMessagesAsRead`**: อัปเดตตารางเป็น IsRead เพื่อจัดการจุดแจ้งเตือน Unread Count

### 📄 `contactController.js` (ระบบติดต่อ Admin)

- **`sendContact` (UC11)**: รับ Subject/Message จาก User ส่งให้ตาราง Contact
- **`getAllContacts`** / **`updateContactStatus`**: สำหรับ Admin เรียกดู และเปลี่ยนสถานะ (รอดำเนินการ -> ตอบแล้ว)

### 📄 `adminController.js` (หลังบ้านแอดมิน)

- **Helper**: `extractCoordsFromGoogleMaps(url)`
  - **การทำงาน**: รับลิงก์ Google Map (เช่น แชร์จากแอปลงมา) แล้วสกัดพิกัด ละติจูด, ลองจิจูด ด้วย Regular Expressions เพื่อให้แอดมินไม่ต้องพิมพ์พิกัดเอง
- **การสถานที่ (`createPlace`, `updatePlaceMoods`, `updatePlace`, `deletePlace`)**: CRUD สถานที่สำหรับแอดมินเท่านั้น โดยเรียกอัปเดตข้อมูล หากมี `googleMapsUrl` จะพยายามสกัดพิกัดเสมอ
- **จัดการ User (`getAllUsers`, `banUser`, `unbanUser`, `suspendUser`, `deleteUser`)**:
  - `suspendUser`: แบนชั่วคราว โดยรับ duration ระบุวัน/ชั่วโมง/นาที คืนสถานะ Active ถ้าผ่านเวลาดังกล่าว (ใช้เวลาตอน Login ใน auth)
  - `deleteUser`: ต้องรับ `confirmText: 'DELETE'` เพื่อยืนยันว่าลบจริงๆ
- **จัดการอีเมล (`sendEmail`, `getEmailLogs`, `resendEmail`)**:
  - ใช้ Nodemailer (`EMAIL_PORT`, `EMAIL_USER`) ยิงเมลออก มี Template HTML แบบคลิกปรับได้คือ Welcome, Newsletter และ Custom ดึงมาจาก `EmailLog` ถ้ายิงพลาดก็เก็บ Error ลงตารางเพื่อให้แอดมินกด `resendEmail` ใหม่ได้

---

## 🚦 6. เราเตอร์ (Routes)

ไฟล์ Routes ภายใน `routes/` ทำหน้าที่เชื่อม API Endpoint ไปหา Controller

- `router.post('/login', login)` -> ไปเรียกโฟลเดอร์ฝั่ง Controller
- แทรกรหัส `protect` และ `adminOnly` ไว้คั่นกลางระหว่างกลางเมื่อจำเป็น
- ตัวอย่าง: `router.post('/places', protect, adminOnly, createPlace)` (สร้างสถานที่ -> ต้อง Login + ต้องเป็น Admin)

---

## สรุป Flow การทำงานง่ายๆ

1. ผู้ใช้ Request หน้าบ้าน (Frontend) -> มาที่ URL เช่น `/api/v1/places/mood/โกรธ`
2. วิ่งเข้ามาที่ Route `placeRoutes.js` -> เรียกไฟล์ `placeController.js` ฟังก์ชัน `getPlacesByMood`
3. Controller จะเรียก `Place.findAll` ผ่าน `models/Place.js`
4. แปลง Rating หาค่าเฉลี่ย
5. ส่ง JSON Response (`res.json`) กลับไปยัง Frontend ภูเพื่อใช้เรนเดอร์ข้อมูล

_เอกสารฉบับนี้จัดทำขึ้นเพื่อช่วยให้คุณเข้าใจกระบวนการ โครงสร้าง และ Flow หลังบ้าน สามารถใช้สำหรับใช้อ้างอิงการพัฒนาต่อยอดได้ทันที!_
