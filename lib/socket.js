const { Server } = require('socket.io');
const http = require('http');
const express = require('express');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// ตั้งค่า Socket.IO
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN
            ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
            : ['http://localhost:5000'],
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

// เก็บ mapping ระหว่าง userId -> socketId
const userSocketMap = {}; // { userId: socketId }

io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;
    console.log('🔌 User connected:', socket.id, '| userId:', userId);

    if (userId) {
        const existingSocketId = userSocketMap[userId];

        // 🌟 ถ้าเจอว่ามีเครื่องเก่าล็อกอินค้างไว้อยู่แล้ว
        if (existingSocketId && existingSocketId !== socket.id) {
            // 🚨 เตะเครื่องเก่าออก!
            io.to(existingSocketId).emit("force_logout", { 
                message: "บัญชีนี้ถูกเข้าสู่ระบบจากอุปกรณ์อื่น คุณจึงถูกออกจากระบบ" 
            });
        }

        userSocketMap[userId] = socket.id;
    }

    // รองรับ event register_user เผื่อฝั่ง frontend ส่งมาแยกต่างหาก
    socket.on("register_user", (reqUserId) => {
        const existingSocketId = userSocketMap[reqUserId];

        if (existingSocketId && existingSocketId !== socket.id) {
            io.to(existingSocketId).emit("force_logout", { 
                message: "บัญชีนี้ถูกเข้าสู่ระบบจากอุปกรณ์อื่น คุณจึงถูกออกจากระบบ" 
            });
        }
        
        userSocketMap[reqUserId] = socket.id;
        io.emit('getOnlineUsers', Object.keys(userSocketMap));
        console.log("UserSocketMap (Registered):", userSocketMap);
    });

    console.log("UserSocketMap", userSocketMap);

    // ส่งรายชื่อ users ที่ออนไลน์อยู่ให้ทุกคน
    io.emit('getOnlineUsers', Object.keys(userSocketMap));

    // เมื่อ disconnect
    socket.on('disconnect', () => {
        console.log('❌ User disconnected:', socket.id);
        
        // ค้นหา userId จาก socket.id ใน userSocketMap แล้วลบออก
        for (const [key, value] of Object.entries(userSocketMap)) {
            if (value === socket.id) {
                delete userSocketMap[key];
                break;
            }
        }

        console.log("UserSocketMap", userSocketMap);
        io.emit('getOnlineUsers', Object.keys(userSocketMap));
    });
});

// ฟังก์ชันหา socketId จาก userId
function getReceiverSocketId(userId) {
    return userSocketMap[userId];
}

module.exports = { io, app, server, getReceiverSocketId };
