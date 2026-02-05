const express = require("express");
const { getMoods, createMood, deleteMood } = require("../controllers/mood.controller");
const { protect, admin } = require("../middlewares/auth.middleware");
const router = express.Router();

// Public
router.get("/", getMoods);

// Admin
router.post("/", protect, admin, createMood);
router.delete("/:id", protect, admin, deleteMood);

module.exports = router;
