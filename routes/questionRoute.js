const express = require("express");
const router = express.Router();
const db = require("../db/dbConfig");
const authMiddleware = require("../middleware/authMiddleware");
// Import Express framework
// Create a router to handle different URL paths
// Import database connection
// Import authentication middleware (checks if user is logged in)

// POST - Create a new question (REQUIRES AUTH) ← Auth added here
router.post("/", authMiddleware, async (req, res) => {
  const { question, question_description, tag } = req.body;
  const userid = req.user.userid;
  // Creates a POST endpoint at the base path "/"
  // authMiddleware means user MUST be logged in to access this
  // async allows us to wait for database operations
  // Extract question data from the request body
  // Get the user's ID (provided by authMiddleware after login verification)
  if (!question || !question_description) {
    return res.status(400).json({
      msg: "Please provide all required fields",
    });
  }
  // Check if question and description exist
  // Send error 400 (Bad Request) if missing
  if (question.trim() === "" || question_description.trim() === "") {
    return res.status(400).json({
      msg: "Question and description cannot be empty",
    });
  }
  // Enforce description max length
  if (question_description.length > 1000) {
    return res.status(400).json({
      msg: "Description must be 1000 characters or fewer",
    });
  }
  // Check if fields are not just empty spaces
  // .trim() removes whitespace from start/end
  try {
    const questionid = `Q${Date.now()}${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    // Generate a unique ID for the question
    // Random string for extra uniqueness
    const sql = `
      INSERT INTO questions (questionid, userid, title, description, tag) 
      VALUES (?, ?, ?, ?, ?)
    `;
    // SQL query to insert new question into database
    await db.execute(sql, [
      questionid,
      userid,
      question,
      question_description,
      tag || null,
    ]);
    // Execute the SQL query
    // Replace ? with actual values in order
    // tag || null means if tag doesn't exist, use null
    res.status(201).json({
      msg: "Question created successfully",
      questionid: questionid,
    });
    //     Send success response (201 = Created)
    // Return the new question ID
  } catch (err) {
    console.error("Error creating question:", err);
    res.status(500).json({
      msg: "An unexpected error occurred.",
      error: err.message,
    });
  }
});
// If anything goes wrong, catch the error

// GET - Get all questions (PUBLIC - NO AUTH) ← No auth needed
router.get("/", async (req, res) => {
  try {
    const { q } = req.query;

    // Base SQL and params
    let sql = `
      SELECT 
        q.id,
        q.questionid,
        q.title,
        q.description,
        q.tag,
        q.created_at,
        u.username,
        u.userid AS owner_userid,
        COALESCE(ac.answer_count, 0) AS answer_count,
        lad.latest_answer_date
      FROM questions q 
      JOIN users u ON q.userid = u.userid 
      LEFT JOIN (
        SELECT questionid, COUNT(*) AS answer_count
        FROM answers
        GROUP BY questionid
      ) ac ON ac.questionid = q.questionid
      LEFT JOIN (
        SELECT questionid, MAX(created_at) AS latest_answer_date
        FROM answers
        GROUP BY questionid
      ) lad ON lad.questionid = q.questionid
    `;
    const params = [];

    if (q && q.trim() !== "") {
      sql += `WHERE q.title LIKE ? OR q.description LIKE ? OR u.username LIKE ? `;
      const like = `%${q.trim()}%`;
      params.push(like, like, like);
    }

    sql += `ORDER BY q.id DESC`;

    const [rows] = await db.execute(sql, params);
    res.json({ questions: rows });
  } catch (err) {
    res.status(500).json({
      msg: "Error fetching questions",
      error: err.message,
    });
  }
});

// GET - Get single question (PUBLIC - NO AUTH) ← No auth needed
router.get("/:questionid", async (req, res) => {
  const { questionid } = req.params;

  try {
    const [rows] = await db.execute(
      `
      SELECT 
        q.id,
        q.questionid,
        q.title,
        q.description,
        q.tag,
        q.created_at,
        u.username,
        u.userid AS owner_userid,
        COALESCE(ac.answer_count, 0) AS answer_count,
        lad.latest_answer_date
      FROM questions q 
      JOIN users u ON q.userid = u.userid 
      LEFT JOIN (
        SELECT questionid, COUNT(*) AS answer_count
        FROM answers
        GROUP BY questionid
      ) ac ON ac.questionid = q.questionid
      LEFT JOIN (
        SELECT questionid, MAX(created_at) AS latest_answer_date
        FROM answers
        GROUP BY questionid
      ) lad ON lad.questionid = q.questionid
      WHERE q.questionid = ?
    `,
      [questionid]
    );
    // Query for ONE specific question matching the ID
    // WHERE q.questionid = ? filters to just that question
    if (rows.length === 0) {
      return res.status(404).json({ msg: "Question not found" });
    }
    // If no question found, send 404 error
    res.json({ question: rows[0] });
    // Send back the first (and only) question found
  } catch (err) {
    res.status(500).json({
      msg: "Error fetching question",
      error: err.message,
    });
  }
});

module.exports = router;
// PUT - Edit a question (REQUIRES AUTH & OWNERSHIP)
router.put("/:questionid", authMiddleware, async (req, res) => {
  const { questionid } = req.params;
  const { title, description, tag } = req.body;
  const userid = req.user.userid;

  if (!title || !description) {
    return res
      .status(400)
      .json({ msg: "Please provide title and description" });
  }
  if (description.length > 1000) {
    return res
      .status(400)
      .json({ msg: "Description must be 1000 characters or fewer" });
  }

  try {
    const [rows] = await db.execute(
      `SELECT userid FROM questions WHERE questionid = ?`,
      [questionid]
    );
    if (rows.length === 0)
      return res.status(404).json({ msg: "Question not found" });
    if (rows[0].userid !== userid)
      return res.status(403).json({ msg: "Not allowed" });

    await db.execute(
      `UPDATE questions SET title = ?, description = ?, tag = ? WHERE questionid = ?`,
      [title, description, tag || null, questionid]
    );
    res.json({ msg: "Question updated" });
  } catch (err) {
    res
      .status(500)
      .json({ msg: "An unexpected error occurred.", error: err.message });
  }
});

// DELETE - Delete a question (REQUIRES AUTH & OWNERSHIP)
router.delete("/:questionid", authMiddleware, async (req, res) => {
  const { questionid } = req.params;
  const userid = req.user.userid;
  try {
    const [rows] = await db.execute(
      `SELECT userid FROM questions WHERE questionid = ?`,
      [questionid]
    );
    if (rows.length === 0)
      return res.status(404).json({ msg: "Question not found" });
    if (rows[0].userid !== userid)
      return res.status(403).json({ msg: "Not allowed" });

    await db.execute(`DELETE FROM questions WHERE questionid = ?`, [
      questionid,
    ]);
    res.json({ msg: "Question deleted" });
  } catch (err) {
    res
      .status(500)
      .json({ msg: "An unexpected error occurred.", error: err.message });
  }
});
