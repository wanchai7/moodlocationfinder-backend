const Mood = require("../models/mood.model");

// Get All Moods
const getMoods = async (req, res) => {
    try {
        const moods = await Mood.find({});
        res.json(moods);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Admin: Create Mood
const createMood = async (req, res) => {
    const { name, description } = req.body;
    try {
        const mood = new Mood({ name, description });
        const createdMood = await mood.save();
        res.status(201).json(createdMood);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Admin: Delete Mood
const deleteMood = async (req, res) => {
    try {
        const mood = await Mood.findById(req.params.id);
        if (mood) {
            await mood.deleteOne();
            res.json({ message: 'Mood removed' });
        } else {
            res.status(404).json({ message: 'Mood not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getMoods, createMood, deleteMood };
