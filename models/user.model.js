const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true, minlength: 4 },
  password: { type: String, required: true, minlength: 6 },
  email: { type: String, required: true, unique: true },
  profilePic: { type: String, default: "" },
  gender: { type: String, enum: ["Male", "Female", "Other", "Prefer not to say"], default: "Prefer not to say" },
  contact: { type: String, default: "" },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  history: [{
    location: { type: Schema.Types.ObjectId, ref: "Location" },
    visitedAt: { type: Date, default: Date.now },
    mood: { type: String }
  }]
}, { timestamps: true });

const UserModel = model("User", UserSchema);
module.exports = UserModel;
