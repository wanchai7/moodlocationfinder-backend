const { Server } = require('socket.io');
const http = require('http');
const express = require('express');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// สร้าง Redis Client สองตัวสำหรับ Pub/Sub ของ Socket.io cluster (ทำหน้าที่กระจาย Event ข้าม PM2 process)
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const pubClient = createClient({ url: redisUrl });
const subClient = pubClient.duplicate();
// สร้าง Redis Client สำหรับเก็บข้อมูล State ทั่วไป (เช่น ข้อมูลว่าใครออนไลน์อยู่)
const redisCache = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect(), redisCache.connect()]).then(() => {
    console.log('✅ Redis connected successfully for Socket.IO & Caching');
    io.adapter(createAdapter(pubClient, subClient));
}).catch(err => {
    console.error('❌ Redis connection error:', err);
});

// ตั้งค่า Socket.IO
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN
            ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
            : ['https://moodlocationproject.vercel.app', 'http://localhost:5173'],
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

io.on('connection', async (socket) => {
    let userId = socket.handshake.query.userId;
    console.log('🔌 User connected:', socket.id, '| userId:', userId);

    if (userId) {
        const existingSocketId = await redisCache.hGet('userSocketMap', String(userId));

        // 🌟 ถ้าเจอว่ามีเครื่องเก่าล็อกอินค้างไว้อยู่แล้ว
        if (existingSocketId && existingSocketId !== socket.id) {
            // 🚨 เตะเครื่องเก่าออก (ผ่าน Redis adapter ไม่จำกัด Process)!
            io.to(existingSocketId).emit("force_logout", { 
                message: "บัญชีนี้ถูกเข้าสู่ระบบจากอุปกรณ์อื่น คุณจึงถูกออกจากระบบ" 
            });
        }

        await redisCache.hSet('userSocketMap', String(userId), socket.id);
    }

    // รองรับ event register_user เผื่อฝั่ง frontend ส่งมาแยกต่างหาก
    socket.on("register_user", async (reqUserId) => {
        userId = reqUserId; // อัปเดต userId ของ socket นี้
        const existingSocketId = await redisCache.hGet('userSocketMap', String(reqUserId));

        if (existingSocketId && existingSocketId !== socket.id) {
            io.to(existingSocketId).emit("force_logout", { 
                message: "บัญชีนี้ถูกเข้าสู่ระบบจากอุปกรณ์อื่น คุณจึงถูกออกจากระบบ" 
            });
        }
        
        await redisCache.hSet('userSocketMap', String(reqUserId), socket.id);
        const allUsers = await redisCache.hKeys('userSocketMap');
        io.emit('getOnlineUsers', allUsers);
    });

    // ส่งรายชื่อ users ที่ออนไลน์อยู่ให้ทุกคน
    const initialUsers = await redisCache.hKeys('userSocketMap');
    io.emit('getOnlineUsers', initialUsers);

    // เมื่อ disconnect
    socket.on('disconnect', async () => {
        console.log('❌ User disconnected:', socket.id);
        
        if (userId) {
            // ตรวจสอบก่อนลบ ว่า socket.id ที่หลุดคืออันเดียวกับที่เซฟไว้ไหม
            const savedSocketId = await redisCache.hGet('userSocketMap', String(userId));
            if (savedSocketId === socket.id) {
                await redisCache.hDel('userSocketMap', String(userId));
            }
        }

        const updatedUsers = await redisCache.hKeys('userSocketMap');
        io.emit('getOnlineUsers', updatedUsers);
    });
});

// ฟังก์ชันหา socketId จาก userId เป็น Async!
async function getReceiverSocketId(userId) {
    if (!userId) return null;
    if (!redisCache.isReady) {
        console.warn('⚠️ Redis is not connected. Skipping getReceiverSocketId.');
        return null; // ป้องกันแอพค้างถ้าไม่ได้เปิด Redis
    }
    try {
        return await redisCache.hGet('userSocketMap', String(userId));
    } catch (err) {
        console.error('Redis hGet error:', err);
        return null;
    }
}

module.exports = { io, app, server, getReceiverSocketId, redisCache };
