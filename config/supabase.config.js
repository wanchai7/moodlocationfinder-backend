require("dotenv").config();

// Supabase configuration
const supabaseConfig = {
  url: process.env.SUPABASE_URL,
  key: process.env.SUPABASE_KEY,
};

module.exports = supabaseConfig;
