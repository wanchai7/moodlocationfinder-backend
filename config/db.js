const { Sequelize } = require('sequelize');
require('dotenv').config();

// รองรับทั้ง DATABASE_URL (Render/Production) และ ENV แยก (Local/Docker)
let sequelize;

if (process.env.DATABASE_URL) {
    // ใช้ DATABASE_URL สำหรับ Render / Production
    sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    });
} else {
    // ใช้ ENV แยกสำหรับ Local Development / Docker
    sequelize = new Sequelize(
        process.env.DB_NAME,
        process.env.DB_USER,
        process.env.DB_PASSWORD,
        {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            dialect: 'postgres',
            logging: false,
            pool: {
                max: 5,
                min: 0,
                acquire: 30000,
                idle: 10000
            }
        }
    );
}

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ PostgreSQL connected successfully');
    } catch (error) {
        console.error('❌ Unable to connect to PostgreSQL:', error.message);
        process.exit(1);
    }
};

module.exports = { sequelize, connectDB };
