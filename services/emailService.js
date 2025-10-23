// emailService.js
require("dotenv").config();
const nodemailer = require("nodemailer");
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");

// Create transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD, // Use App Password if Gmail 2FA enabled
  },
});

// Create MySQL pool
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// ------------------- Helper: Send OTP Email -------------------
const sendOTPEmail = async (email, otp) => {
  try {
    const mailOptions = {
      from: `"Evangadi Forum" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Evangadi Forum - Password Reset OTP",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
          <h2>Password Reset OTP</h2>
          <p>Your OTP code is:</p>
          <h1 style="color: #667eea;">${otp}</h1>
          <p>This OTP will expire in 10 minutes. Do not share it with anyone.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ OTP email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ OTP email failed:", error.message);
    return { success: false, error: error.message };
  }
};

// ------------------- Helper: Password Reset Success Email -------------------
const sendPasswordResetSuccessEmail = async (email) => {
  try {
    const mailOptions = {
      from: `"Evangadi Forum" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Evangadi Forum - Password Reset Successful",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
          <h2>Password Reset Successful ✅</h2>
          <p>Your password has been successfully reset. You can now login with your new password.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Password reset success email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Password reset success email failed:", error.message);
    return { success: false, error: error.message };
  }
};

// ------------------- Generate OTP & Save to DB -------------------
const generateAndSendOTP = async (email) => {
  // Check if user exists
  const [users] = await db.query("SELECT id FROM users WHERE email = ?", [
    email,
  ]);
  if (!users.length)
    return { success: false, message: "No account with this email." };

  const userId = users[0].id;
  const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

  // Save OTP in password_resets table
  await db.query(
    "INSERT INTO password_resets (user_id, otp, expires_at, attempts, created_at) VALUES (?, ?, ?, 0, NOW())",
    [userId, otp, expiresAt]
  );

  // Send OTP email
  return await sendOTPEmail(email, otp);
};

// ------------------- Verify OTP & Reset Password -------------------
const verifyOTPAndResetPassword = async (email, otp, newPassword) => {
  // Check if user exists
  const [users] = await db.query("SELECT id FROM users WHERE email = ?", [
    email,
  ]);
  if (!users.length)
    return { success: false, message: "No account with this email." };

  const userId = users[0].id;

  // Get OTP record
  const [records] = await db.query(
    "SELECT * FROM password_resets WHERE user_id = ? AND otp = ? ORDER BY created_at DESC LIMIT 1",
    [userId, otp]
  );

  if (!records.length) return { success: false, message: "Invalid OTP." };

  const record = records[0];
  const now = new Date();
  if (new Date(record.expires_at) < now)
    return { success: false, message: "OTP expired." };

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await db.query("UPDATE users SET password = ? WHERE id = ?", [
    hashedPassword,
    userId,
  ]);

  // Delete used OTP
  await db.query("DELETE FROM password_resets WHERE id = ?", [record.id]);

  // Send success email
  await sendPasswordResetSuccessEmail(email);

  return { success: true, message: "Password reset successfully." };
};

module.exports = {
  sendOTPEmail,
  sendPasswordResetSuccessEmail,
  generateAndSendOTP,
  verifyOTPAndResetPassword,
};
