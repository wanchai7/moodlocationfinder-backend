const express = require("express");
require("dotenv").config();
const cors = require("cors");
const mongoose = require("mongoose");

const userRouter = require("./routers/user.router");

const app = express();
const PORT = process.env.PORT;
const BASE_URL = process.env.BASE_URL;
const DB_URL = process.env.DB_URL;

app.use(cors({ origin: BASE_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("<h1>Welcome to Mood Location Finder Restful API</h1>");
});

if (!DB_URL) {
  console.error("DB_URL is missing. Please set it in your .env file");
} else {
  mongoose
    .connect(DB_URL)
    .then(() => {
      console.log("MongoDB connected successfully");
    })
    .catch((error) => {
      console.error("MongoDB connection error:", error.message);
    });
}
//use Router
app.use("/api/v1/user", userRouter);
app.listen(PORT, () => {
  console.log("Server is running on http://localhost:" + PORT);
});
