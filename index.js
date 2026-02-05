const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const { errorHandler } = require("./middlewares/error.middleware");

// Load enc vars
dotenv.config();

// Connect to Database
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routers
const authRouter = require("./routers/auth.router");
const userRouter = require("./routers/user.router");
const locationRouter = require("./routers/location.router");
const moodRouter = require("./routers/mood.router");

app.get("/", (req, res) => {
  res.send("<h1>Welcome to Mood Location Finder API</h1>");
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/locations", locationRouter);
app.use("/api/v1/moods", moodRouter);

// Error Middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
