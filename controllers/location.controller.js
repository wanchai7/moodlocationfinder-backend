const Location = require("../models/location.model");
const Mood = require("../models/mood.model");
const model = require("../config/gemini");
const axios = require('axios');

// Get all locations
const getLocations = async (req, res) => {
    try {
        const locations = await Location.find().populate("moods");
        res.json(locations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get single location
const getLocationById = async (req, res) => {
    try {
        const location = await Location.findById(req.params.id).populate("moods");
        if (location) {
            // Optional: Call Google Maps API to get more details if needed
            // For now, we return stored details
            res.json(location);
        } else {
            res.status(404).json({ message: "Location not found" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Search Locations by Mood (Gemini Integrated)
const searchLocationsByMood = async (req, res) => {
    const { moodText } = req.body;

    if (!moodText) {
        return res.status(400).json({ message: "Please provide a mood text" });
    }

    try {
        // 1. Use Gemini to interpret mood and suggest categories/keywords
        const prompt = `User feels: "${moodText}". Suggest 3 distinct location categories (e.g., Cafe, Park, Library, Bar, Gym) that would best suit this mood. Return ONLY the categories separated by commas, no extra text.`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const categories = text.split(',').map(c => c.trim());

        // 2. Find locations matching these categories OR matching Pre-defined Moods
        // For simplicity, we search locations where category matches or mood name matches
        const locations = await Location.find({
            $or: [
                { category: { $in: categories.map(c => new RegExp(c, 'i')) } },
                // Assuming we might have description search too
                { description: { $regex: moodText, $options: 'i' } }
            ]
        }).populate("moods");

        res.json({
            interpretedCategories: categories,
            locations
        });

    } catch (error) {
        console.error("Gemini/Search Error:", error);
        res.status(500).json({ message: "Error processing mood search" });
    }
};

// Admin: Create Location
const createLocation = async (req, res) => {
    const { name, category, description, address, imageUrl, moodIds } = req.body;

    // Geocode address using Google Maps API (if address provided but no lat/lng)
    let latitude = 0;
    let longitude = 0;

    if (address && process.env.GOOGLE_MAPS_API_KEY) {
        try {
            const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
            const response = await axios.get(geocodeUrl);
            if (response.data.status === 'OK') {
                const location = response.data.results[0].geometry.location;
                latitude = location.lat;
                longitude = location.lng;
            }
        } catch (error) {
            console.error("Geocoding error:", error.message);
        }
    }

    try {
        const location = new Location({
            name,
            category,
            description,
            address,
            imageUrl,
            latitude,
            longitude,
            moods: moodIds
        });
        const createdLocation = await location.save();
        res.status(201).json(createdLocation);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Admin: Update Location
const updateLocation = async (req, res) => {
    try {
        const location = await Location.findById(req.params.id);
        if (location) {
            location.name = req.body.name || location.name;
            location.category = req.body.category || location.category;
            location.description = req.body.description || location.description;
            location.address = req.body.address || location.address;
            location.imageUrl = req.body.imageUrl || location.imageUrl;

            // Note: If address changes, we might want to re-geocode in a real app

            const updatedLocation = await location.save();
            res.json(updatedLocation);
        } else {
            res.status(404).json({ message: 'Location not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Admin: Delete Location
const deleteLocation = async (req, res) => {
    try {
        const location = await Location.findById(req.params.id);
        if (location) {
            await location.deleteOne();
            res.json({ message: 'Location removed' });
        } else {
            res.status(404).json({ message: 'Location not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getLocations,
    getLocationById,
    searchLocationsByMood,
    createLocation,
    updateLocation,
    deleteLocation
};
