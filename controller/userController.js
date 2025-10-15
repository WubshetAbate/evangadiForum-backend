const dbConnection = require("../db/dbConfig");
const bcrypt = require("bcrypt");
const { StatusCodes } = require("http-status-codes");
const jwt = require("jsonwebtoken");
const {
  sendOTPEmail,
  sendPasswordResetSuccessEmail,
} = require("../services/emailService");

async function register(req, res) {
  try {
    console.log("📥 Received body:", req.body);
    const { username, firstname, lastname, email, password } = req.body;

    // Validate required fields
    if (!username || !firstname || !lastname || !email || !password) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        msg: "Please provide all required fields",
      });
    }

    // Check if username or email already exists
    const [existingUser] = await dbConnection.query(
      "SELECT username FROM users WHERE username = ? OR email = ?",
      [username, email]
    );

    if (existingUser.length > 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        msg: "User with this username or email already exists",
      });
    }

    // Password length check
    if (password.length < 8) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        msg: "Password must be at least 8 characters long",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert into DB
    await dbConnection.query(
      "INSERT INTO users (userid, username, firstname, lastname, email, password) VALUES (UUID(), ?, ?, ?, ?, ?)",
      [username, firstname, lastname, email, hashedPassword]
    );

    return res.status(StatusCodes.CREATED).json({
      msg: "User registered successfully",
    });
  } catch (error) {
    console.error("❌ Register error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      msg: "Something went wrong, please try again later",
    });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        msg: "Please enter all required fields",
      });
    }

    const [user] = await dbConnection.query(
      "SELECT userid, username, email, password FROM users WHERE email = ?",
      [email]
    );

    if (user.length === 0) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ msg: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user[0].password);
    if (!isMatch) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ msg: "Invalid credentials" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ msg: "Server misconfiguration: missing JWT secret" });
    }

    const token = jwt.sign(
      { userid: user[0].userid, username: user[0].username },
      secret,
      { expiresIn: "1d" }
    );

    return res.status(StatusCodes.OK).json({
      msg: "Login successful",
      token,
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      msg: "Something went wrong, please try again later",
    });
  }
}

async function checkUser(req, res) {
  const { username, userid } = req.user;
  res.status(StatusCodes.OK).json({
    msg: "Valid user",
    username,
    userid,
  });
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        msg: "Please provide email address",
      });
    }

    // Check if user exists
    const [user] = await dbConnection.query(
      "SELECT userid, email FROM users WHERE email = ?",
      [email]
    );

    if (user.length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        msg: "No account found with this email address",
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in database with expiration (10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    await dbConnection.query(
      "INSERT INTO password_resets (email, otp, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE otp = ?, expires_at = ?",
      [email, otp, expiresAt, otp, expiresAt]
    );

    // Send OTP via email
    const emailResult = await sendOTPEmail(email, otp);

    if (emailResult.success) {
      console.log(`✅ OTP email sent to ${email}: ${otp}`);
      return res.status(StatusCodes.OK).json({
        msg: "OTP sent to your email address",
      });
    } else {
      console.error(`❌ Failed to send email to ${email}:`, emailResult.error);
      // Still return success to user for security (don't reveal email issues)
      console.log(`📧 OTP for ${email}: ${otp}`); // Fallback: log OTP for development
      return res.status(StatusCodes.OK).json({
        msg: "OTP sent to your email address",
      });
    }
  } catch (error) {
    console.error("❌ Forgot password error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      msg: "Something went wrong, please try again later",
    });
  }
}

async function verifyOTP(req, res) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        msg: "Please provide email and OTP",
      });
    }

    // Check if OTP exists and is valid
    const [resetRecord] = await dbConnection.query(
      "SELECT otp, expires_at FROM password_resets WHERE email = ?",
      [email]
    );

    if (resetRecord.length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        msg: "No OTP found for this email. Please request a new one.",
      });
    }

    // Check if OTP has expired
    if (new Date() > new Date(resetRecord[0].expires_at)) {
      // Clean up expired record
      await dbConnection.query("DELETE FROM password_resets WHERE email = ?", [
        email,
      ]);
      return res.status(StatusCodes.BAD_REQUEST).json({
        msg: "OTP has expired. Please request a new one.",
      });
    }

    // Verify OTP
    if (resetRecord[0].otp !== otp) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        msg: "Invalid OTP. Please try again.",
      });
    }

    // Generate temporary token for password reset
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        msg: "Server misconfiguration: missing JWT secret",
      });
    }

    const token = jwt.sign(
      { email, purpose: "password_reset" },
      secret,
      { expiresIn: "15m" } // 15 minutes
    );

    return res.status(StatusCodes.OK).json({
      msg: "OTP verified successfully",
      token,
    });
  } catch (error) {
    console.error("❌ Verify OTP error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      msg: "Something went wrong, please try again later",
    });
  }
}

async function resetPassword(req, res) {
  try {
    const { email, token, password } = req.body;

    if (!email || !token || !password) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        msg: "Please provide all required fields",
      });
    }

    // Verify token
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        msg: "Server misconfiguration: missing JWT secret",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (error) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        msg: "Invalid or expired token",
      });
    }

    if (decoded.email !== email || decoded.purpose !== "password_reset") {
      return res.status(StatusCodes.BAD_REQUEST).json({
        msg: "Invalid token",
      });
    }

    // Password validation
    if (password.length < 8) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        msg: "Password must be at least 8 characters long",
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update password in database
    await dbConnection.query("UPDATE users SET password = ? WHERE email = ?", [
      hashedPassword,
      email,
    ]);

    // Clean up password reset records
    await dbConnection.query("DELETE FROM password_resets WHERE email = ?", [
      email,
    ]);

    // Send password reset success email
    await sendPasswordResetSuccessEmail(email);

    return res.status(StatusCodes.OK).json({
      msg: "Password reset successfully",
    });
  } catch (error) {
    console.error("❌ Reset password error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      msg: "Something went wrong, please try again later",
    });
  }
}

module.exports = {
  register,
  login,
  checkUser,
  forgotPassword,
  verifyOTP,
  resetPassword,
};
