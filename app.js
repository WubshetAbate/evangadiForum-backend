require("dotenv").config();
const express = require("express");
const cors = require("cors");
const dbConnection = require("./db/dbConfig");

const app = express();
const port = process.env.PORT || 5500;

// Configure CORS properly
import cors from "cors";
app.use(
  cors({
    origin: "https://evangadi-forum-frontend-omega.vercel.app",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);


// Parse JSON before routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const userRoutes = require("./routes/userRoute");
const questionRoutes = require("./routes/questionRoute");
const answerRoutes = require("./routes/answerRoute");

// Use routes
app.use("/api/users", userRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/answers", answerRoutes);

// Test DB connection
async function start() {
  try {
    const result = await dbConnection.execute("SELECT 'db connected'");
    console.log("✅ Connected to MySQL Database:", result[0]);
  } catch (error) {
    console.log("❌ Database connection error:", error.message);
  }
}

start();

// Start server
app.listen(port, (err) => {
  if (err) {
    console.log("❌ Server start error:", err);
  } else {
    console.log(`✅ Server listening on port ${port}`);
    console.log("📍 Routes ready: /api/users, /api/questions, /api/answers");
  }
});
