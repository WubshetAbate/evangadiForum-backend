const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();

// ✅ Allow frontend domains (Vercel + localhost)
const allowedOrigins = [
  "https://evangadi-forum-frontend-uakk.vercel.app", // ✅ current Vercel deployment
  "https://evangadi-forum-frontend-omega.vercel.app", // old Vercel deployment
  "http://localhost:5173", // local development
];

// ✅ Secure, dynamic CORS configuration
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn("❌ Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// ✅ Middleware
app.use(bodyParser.json());

// ✅ Example project route (you can keep your existing ones)
app.get("/api/projects", (req, res) => {
  res.json([
    {
      id: 1,
      title: "Netflix Clone",
      desc: "A modern, responsive Netflix website built with React and API integration",
      tech: ["React", "API", "Node"],
      link: "https://github.com/WubshetAbate/Netflix-Clone-2025.git",
      demo: "https://wubshetnetfliix.netlify.app/",
    },
    {
      id: 2,
      title: "Amazon Clone",
      desc: "Full-stack e-commerce application with payment integration",
      tech: ["React", "Stripe", "Node", "MySQL DB", "Firebase"],
      link: "https://github.com/WubshetAbate/Amazon-frontend.git",
      demo: "https://wubshet-amazon-fullstack-app.netlify.app/",
    },
    {
      id: 3,
      title: "Question and Answer App",
      desc: "Collaborative app for signup, login, post & get questions with answers",
      tech: ["React", "Node", "Express", "MySQL"],
      link: "https://github.com/WubshetAbate/evangadiForum-backend.git",
      demo: "https://wubshet-evangadiforum.netlify.app/",
    },
    {
      id: 4,
      title: "Apple Website",
      desc: "A clone of Apple's official website built with React and Express",
      tech: ["React", "Express", "MySQL"],
      link: "https://github.com/WubshetAbate/Apple-by-React.git",
      demo: "https://silly-naiad-a0b745.netlify.app/",
    },
    {
      id: 5,
      title: "Local Calculator",
      desc: "A Local Calculator that performs various mathematical operations",
      tech: ["HTML", "CSS", "JavaScript"],
      link: "https://github.com/WubshetAbate/Calculator-project.git",
      demo: "https://wubshet-calculator.netlify.app/",
    },
    {
      id: 6,
      title: "Weather App",
      desc: "A Weather App that shows the weather of any city in the world",
      tech: ["HTML", "Modular CSS", "JS", "API"],
      link: "https://github.com/WubshetAbate/weather-app.git",
      demo: "https://wubshet-weather-app.netlify.app/",
    },
  ]);
});

// ✅ Forgot-password route example
app.post("/api/users/forgot-password", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  console.log("Forgot password requested for:", email);
  res.json({ message: "Password reset email sent (mock response)" });
});

// ✅ Register route (to fix your registration CORS issue)
app.post("/api/users/register", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: "All fields are required" });

  console.log("Registration request for:", email);
  res.json({ success: true, message: "User registered successfully (mock)" });
});

// ✅ Default route to confirm server is running
app.get("/", (req, res) => {
  res.send("✅ Backend is running successfully!");
});

// ✅ Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`✅ Server listening on port ${PORT}`));
