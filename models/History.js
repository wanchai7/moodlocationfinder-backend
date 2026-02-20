const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    locationId: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true // 'forest' or 'sea'
    },
    date: {
        type: String, // Format: YYYY-MM-DD
        required: true
    },
    time: {
        type: String, // Format: HH:mm
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now // For sorting
    }
});

module.exports = mongoose.model('History', historySchema);
