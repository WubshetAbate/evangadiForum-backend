const express = require("express");
// Imports the Express framework into this file. Express is a web application framework for Node.js used to build APIs and web applications.
const router = express.Router();
// express.Router() is a mini Express application that can handle routes independently.
// user controllers
const {
  register,
  login,
  checkUser,
  forgotPassword,
  verifyOTP,
  resetPassword,
} = require("../controller/userController");
// Imports three controller functions from the userController.js file located in the parent directory's controller folder
// authentication middleware
const authMiddleware = require("../middleware/authMiddleware");

// register route
router.post("/register", register);

// login user
router.post("/login", login);
// check user
router.get("/check", authMiddleware, checkUser);

// forgot password routes
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOTP);
router.post("/reset-password", resetPassword);

module.exports = router;
