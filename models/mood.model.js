const mongoose = require("mongoose");

const MoodSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String },
    relatedLocations: [{ type: mongoose.Schema.Types.ObjectId, ref: "Location" }]
}, { timestamps: true });

module.exports = mongoose.model("Mood", MoodSchema);
