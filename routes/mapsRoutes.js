const express = require('express');
const router = express.Router();
const mapsController = require('../controllers/mapsController'); // ชี้ไปที่ไฟล์ที่เราเพิ่งสร้าง

// เมื่อหน้าเว็บเรียกมาที่ /api/v1/maps/search ให้ทำฟังก์ชัน searchNearbyPlaces
router.get('/search', mapsController.searchNearbyPlaces);

module.exports = router;
