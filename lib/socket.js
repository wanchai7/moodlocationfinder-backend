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

    // ส่งรายชื่อ users ที่ออนไลน์อยู่ให้ทุกคน
    io.emit('getOnlineUsers', Object.keys(userSocketMap));

    // เมื่อ user เข้าร่วมห้องแชท
    socket.on('joinRoom', (roomId) => {
        socket.join(`room_${roomId}`);
        console.log(`📥 User ${userId} joined room_${roomId}`);
    });

    // เมื่อ user ออกจากห้องแชท
    socket.on('leaveRoom', (roomId) => {
        socket.leave(`room_${roomId}`);
        console.log(`📤 User ${userId} left room_${roomId}`);
    });

    // เมื่อกำลังพิมพ์
    socket.on('typing', (data) => {
        socket.to(`room_${data.roomId}`).emit('userTyping', {
            userId: data.userId,
            roomId: data.roomId
        });
    });

    // เมื่อหยุดพิมพ์
    socket.on('stopTyping', (data) => {
        socket.to(`room_${data.roomId}`).emit('userStopTyping', {
            userId: data.userId,
            roomId: data.roomId
        });
    });

    // เมื่อ disconnect
    socket.on('disconnect', () => {
        console.log('❌ User disconnected:', socket.id);
        if (userId) {
            delete userSocketMap[userId];
        }
        io.emit('getOnlineUsers', Object.keys(userSocketMap));
    });
});

// ฟังก์ชันหา socketId จาก userId
function getReceiverSocketId(userId) {
    return userSocketMap[userId];
}

module.exports = { io, app, server, getReceiverSocketId };
