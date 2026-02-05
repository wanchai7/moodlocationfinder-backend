const express = require("express");
const { getUserProfile, updateUserProfile, getUsers, deleteUser } = require("../controllers/user.controller");
const { protect, admin } = require("../middlewares/auth.middleware");
const router = express.Router();

router.route("/profile").get(protect, getUserProfile).put(protect, updateUserProfile);

// Admin Routes
router.route("/").get(protect, admin, getUsers);
router.route("/:id").delete(protect, admin, deleteUser);

module.exports = router;
