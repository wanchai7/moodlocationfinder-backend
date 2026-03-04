/**
 * Seed Script - สร้างข้อมูลตัวอย่าง
 * 
 * วิธีใช้งาน:
 * node seed.js          - สร้างข้อมูลทั้งหมด
 * node seed.js --admin  - สร้างเฉพาะ Admin user
 * node seed.js --places - สร้างเฉพาะ Places
 */

require('dotenv').config();
const { sequelize, User, Place } = require('./models');
const bcrypt = require('bcryptjs');

const seedAdmin = async () => {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    const [admin, created] = await User.findOrCreate({
        where: { email: 'admin@example.com' },
        defaults: {
            firstName: 'แอดมิน',
            lastName: 'ระบบ',
            email: 'admin@example.com',
            password: hashedPassword,
            gender: 'other',
            role: 'admin',
            status: 'active'
        }
    });

    if (!created) {
        // อัปเดตให้เป็น admin ถ้ามีอยู่แล้ว
        admin.role = 'admin';
        await admin.save();
        console.log('✅ Admin user updated');
    } else {
        console.log('✅ Admin user created');
    }

    return admin;
};

const seedPlaces = async () => {
    const places = [
        {
            name: 'Café de Chill',
            description: 'คาเฟ่เงียบสงบ บรรยากาศดี มีดนตรี Acoustic เบาๆ เหมาะกับคนที่อยากผ่อนคลายหลังเลิกงาน',
            category: 'คาเฟ่',
            moods: ['เครียด', 'ผ่อนคลาย', 'เศร้า'],
            personality: ['introvert', 'creative'],
            images: ['https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800'],
            address: '123 ถนนสุขุมวิท กรุงเทพ',
            latitude: 13.7563,
            longitude: 100.5018
        },
        {
            name: 'สวนลุมพินี',
            description: 'สวนสาธารณะกลางกรุงเทพ เหมาะกับการวิ่ง ปั่นจักรยาน หรือนั่งเล่นพักผ่อน',
            category: 'สวนสาธารณะ',
            moods: ['เครียด', 'ผ่อนคลาย', 'มีความสุข', 'ตื่นเต้น'],
            personality: ['extrovert', 'introvert'],
            images: ['https://images.unsplash.com/photo-1585938389612-a552a28d6914?w=800'],
            address: 'ถนนพระราม 4 กรุงเทพ',
            latitude: 13.7308,
            longitude: 100.5412
        },
        {
            name: 'Rooftop Bar Bangkok',
            description: 'บาร์ลอยฟ้า วิวแม่น้ำเจ้าพระยา บรรยากาศโรแมนติก เหมาะกับคู่รัก',
            category: 'บาร์',
            moods: ['โรแมนติก', 'มีความสุข', 'ตื่นเต้น'],
            personality: ['extrovert', 'romantic'],
            images: ['https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800'],
            address: '456 ถนนเจริญกรุง กรุงเทพ',
            latitude: 13.7234,
            longitude: 100.5137
        },
        {
            name: 'วัดพระแก้ว',
            description: 'สถานที่ทางศาสนาที่สวยงาม เหมาะกับการสงบจิตใจ ทำสมาธิ',
            category: 'วัด',
            moods: ['เศร้า', 'เครียด', 'ผ่อนคลาย'],
            personality: ['introvert', 'spiritual'],
            images: ['https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=800'],
            address: 'ถนนหน้าพระลาน กรุงเทพ',
            latitude: 13.7516,
            longitude: 100.4927
        },
        {
            name: 'Adventure Park',
            description: 'สวนสนุกและกิจกรรมผจญภัย เหมาะกับคนที่อยากลืมเรื่องเครียดๆ',
            category: 'สวนสนุก',
            moods: ['เครียด', 'ตื่นเต้น', 'มีความสุข', 'โกรธ'],
            personality: ['extrovert', 'adventurous'],
            images: ['https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?w=800'],
            address: '789 ถนนรัชดา กรุงเทพ',
            latitude: 13.7649,
            longitude: 100.5735
        },
        {
            name: 'ห้องสมุด TK Park',
            description: 'พื้นที่อ่านหนังสือเงียบสงบ มีมุมนั่งสบาย เหมาะกับคนที่อยากอยู่คนเดียว',
            category: 'ห้องสมุด',
            moods: ['เศร้า', 'เครียด', 'ผ่อนคลาย'],
            personality: ['introvert', 'bookworm'],
            images: ['https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800'],
            address: 'CentralWorld กรุงเทพ',
            latitude: 13.7466,
            longitude: 100.5391
        },
        {
            name: 'ตลาดนัดจตุจักร',
            description: 'ตลาดนัดสุดฮิต มีของกิน ของใช้ เสื้อผ้า เยอะแยะ เดินเพลินมาก',
            category: 'ตลาด',
            moods: ['มีความสุข', 'ตื่นเต้น', 'ผ่อนคลาย'],
            personality: ['extrovert', 'shopaholic'],
            images: ['https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800'],
            address: 'ถนนกำแพงเพชร 2 กรุงเทพ',
            latitude: 13.7999,
            longitude: 100.5500
        },
        {
            name: 'ที่พักริมหาด Ocean View',
            description: 'ที่พักริมทะเล เสียงคลื่น บรรยากาศสงบ เหมาะกับการพักผ่อนยาวๆ',
            category: 'ที่พัก',
            moods: ['เศร้า', 'เครียด', 'ผ่อนคลาย', 'โรแมนติก'],
            personality: ['introvert', 'romantic'],
            images: ['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800'],
            address: 'หาดบางแสน ชลบุรี',
            latitude: 13.2838,
            longitude: 100.9138
        }
    ];

    for (const placeData of places) {
        await Place.findOrCreate({
            where: { name: placeData.name },
            defaults: placeData
        });
    }

    console.log(`✅ ${places.length} places seeded`);
};

const seed = async () => {
    try {
        await sequelize.authenticate();
        console.log('📦 Connected to PostgreSQL');

        await sequelize.sync({ alter: true });
        console.log('📦 Database synced');

        const args = process.argv.slice(2);

        if (args.includes('--admin')) {
            await seedAdmin();
        } else if (args.includes('--places')) {
            await seedPlaces();
        } else {
            await seedAdmin();
            await seedPlaces();
        }

        console.log('\n🎉 Seed completed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seed error:', error);
        process.exit(1);
    }
};

seed();
