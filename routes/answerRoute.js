const express = require("express");
const router = express.Router();
const db = require("../db/dbConfig");
const authMiddleware = require("../middleware/authMiddleware");

// POST - Add a new answer (REQUIRES AUTH)
router.post("/", authMiddleware, async (req, res) => {
  const { answer, question_id } = req.body;
  const userid = req.user.userid;

  if (!answer || !question_id) {
    return res.status(400).json({
      msg: "Please provide all required fields",
    });
  }

  if (answer.trim() === "") {
    return res.status(400).json({
      msg: "Answer cannot be empty",
    });
  }

  try {
    const [questionCheck] = await db.execute(
      `SELECT questionid FROM questions WHERE questionid = ?`,
      [question_id]
    );

    if (questionCheck.length === 0) {
      return res.status(404).json({
        msg: "Question not found",
      });
    }

    const sql = `INSERT INTO answers (userid, questionid, answer) VALUES (?, ?, ?)`;
    await db.execute(sql, [userid, question_id, answer]);

    res.status(201).json({
      msg: "Answer posted successfully",
    });
  } catch (err) {
    console.error("Error posting answer:", err.message);
    res.status(500).json({
      msg: "An unexpected error occurred.",
      error: err.message,
    });
  }
});

// GET - Get all answers for a specific question (PUBLIC)
router.get("/:questionid", async (req, res) => {
  const { questionid } = req.params;

  if (!questionid) {
    return res.status(400).json({
      msg: "Question ID is required",
    });
  }

  try {
    const [questionCheck] = await db.execute(
      `SELECT questionid FROM questions WHERE questionid = ?`,
      [questionid]
    );

    if (questionCheck.length === 0) {
      return res.status(404).json({
        msg: "Question not found",
      });
    }

    const [answers] = await db.execute(
      `SELECT 
        a.answerid,
        a.answer,
        a.questionid,
        a.created_at,
        u.userid,
        u.username
      FROM answers a
      LEFT JOIN users u ON a.userid = u.userid
      WHERE a.questionid = ?
      ORDER BY a.answerid DESC`,
      [questionid]
    );

    res.status(200).json({
      questionid: questionid,
      answers: answers,
    });
  } catch (err) {
    console.error("Error fetching answers:", err);
    res.status(500).json({
      msg: "An unexpected error occurred.",
      error: err.message,
    });
  }
});

module.exports = router;
// PUT - Edit an answer (REQUIRES AUTH & OWNERSHIP)
router.put("/:answerid", authMiddleware, async (req, res) => {
  const { answerid } = req.params;
  const { answer } = req.body;
  const userid = req.user.userid;

  if (!answer || answer.trim() === "") {
    return res.status(400).json({ msg: "Answer cannot be empty" });
  }

  try {
    const [rows] = await db.execute(
      `SELECT userid FROM answers WHERE answerid = ?`,
      [answerid]
    );
    if (rows.length === 0)
      return res.status(404).json({ msg: "Answer not found" });
    if (rows[0].userid !== userid)
      return res.status(403).json({ msg: "Not allowed" });

    await db.execute(`UPDATE answers SET answer = ? WHERE answerid = ?`, [
      answer,
      answerid,
    ]);
    res.json({ msg: "Answer updated" });
  } catch (err) {
    res
      .status(500)
      .json({ msg: "An unexpected error occurred.", error: err.message });
  }
});

// DELETE - Delete an answer (REQUIRES AUTH & OWNERSHIP)
router.delete("/:answerid", authMiddleware, async (req, res) => {
  const { answerid } = req.params;
  const userid = req.user.userid;
  try {
    const [rows] = await db.execute(
      `SELECT userid FROM answers WHERE answerid = ?`,
      [answerid]
    );
    if (rows.length === 0)
      return res.status(404).json({ msg: "Answer not found" });
    if (rows[0].userid !== userid)
      return res.status(403).json({ msg: "Not allowed" });

    await db.execute(`DELETE FROM answers WHERE answerid = ?`, [answerid]);
    res.json({ msg: "Answer deleted" });
  } catch (err) {
    res
      .status(500)
      .json({ msg: "An unexpected error occurred.", error: err.message });
  }
});
