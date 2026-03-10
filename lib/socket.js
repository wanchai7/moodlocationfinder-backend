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
        userSocketMap[userId] = socket.id;
    }

    console.log("UserSocketMap", userSocketMap);

    // ส่งรายชื่อ users ที่ออนไลน์อยู่ให้ทุกคน
    io.emit('getOnlineUsers', Object.keys(userSocketMap));

    // เมื่อ disconnect
    socket.on('disconnect', () => {
        console.log('❌ User disconnected:', socket.id);
        if (userId) {
            delete userSocketMap[userId];
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
