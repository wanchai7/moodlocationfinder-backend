const express = require("express");
const {
    getLocations,
    getLocationById,
    searchLocationsByMood,
    createLocation,
    updateLocation,
    deleteLocation
} = require("../controllers/location.controller");
const { protect, admin } = require("../middlewares/auth.middleware");
const router = express.Router();

// Public Routes
router.get("/", getLocations);
router.get("/:id", getLocationById);
router.post("/search", searchLocationsByMood);

// Admin Routes
router.post("/", protect, admin, createLocation);
router.put("/:id", protect, admin, updateLocation);
router.delete("/:id", protect, admin, deleteLocation);

module.exports = router;
