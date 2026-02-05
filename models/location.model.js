const mongoose = require("mongoose");

const LocationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    category: { type: String, required: true },
    imageUrl: { type: String },
    address: { type: String },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    moods: [{ type: mongoose.Schema.Types.ObjectId, ref: "Mood" }],
    reviews: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        comment: { type: String },
        rating: { type: Number, min: 1, max: 5 },
        createdAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

module.exports = mongoose.model("Location", LocationSchema);
