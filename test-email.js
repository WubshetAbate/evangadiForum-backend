require("dotenv").config();
const { sendOTPEmail } = require("./services/emailService");

async function testEmail() {
  console.log("🧪 Testing email configuration...");
  console.log("EMAIL_USER:", process.env.EMAIL_USER);
  console.log(
    "EMAIL_PASSWORD:",
    process.env.EMAIL_PASSWORD ? "***" : "NOT SET"
  );

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error("❌ Email credentials not configured!");
    console.log("Please update your .env file with:");
    console.log("EMAIL_USER=your-email@gmail.com");
    console.log("EMAIL_PASSWORD=your-app-password");
    return;
  }

  if (process.env.EMAIL_USER === "your-email@gmail.com") {
    console.error(
      "❌ Please replace the placeholder email with your actual email!"
    );
    return;
  }

  try {
    console.log("📧 Sending test email...");
    const result = await sendOTPEmail(process.env.EMAIL_USER, "123456");

    if (result.success) {
      console.log("✅ Email sent successfully!");
      console.log("Check your inbox for the test email.");
    } else {
      console.error("❌ Email failed:", result.error);
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

testEmail();
