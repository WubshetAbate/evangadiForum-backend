require("dotenv").config();
const express = require("express");
const app = express();
const port = process.env.PORT || 5500;

const cors = require("cors");
app.use(cors());

// db connection
const dbConnection = require("./db/dbConfig");

// JSON parsing middleware (BEFORE routes)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import route files
const userRoutes = require("./routes/userRoute");
const questionRoutes = require("./routes/questionRoute");
const answerRoutes = require("./routes/answerRoute");

// Route middlewares
app.use("/api/users", userRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/answers", answerRoutes);

// Test database connection
async function start() {
  try {
    const result = await dbConnection.execute("SELECT 'db connected'");
    console.log("✅ Connected to MySQL Database:", result[0]);
  } catch (error) {
    console.log("❌ Database connection error:", error.message);
  }
}

start();

app.listen(port, (err) => {
  if (err) {
    console.log("❌ Server start error:", err);
  } else {
    console.log(`✅ Server listening on port ${port}`);
    console.log("📍 Routes ready: /api/users, /api/questions, /api/answers");
  }
});
