const express = require("express");
const dbConnection = require("../db/dbConfig");
const { StatusCodes } = require("http-status-codes");

// POST - Create a new answer (REQUIRES AUTH)
async function createAnswer(req, res) {
  const { answer, question_id } = req.body;
  const userid = req.user.userid;
  // Extract answer and que_id from the request body
  // Get the user's ID  from req.user(provided by authMiddleware after login verification)

  if (!answer || !question_id) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      msg: "Please provide all required fields",
    });
  }
  // Check if answer and question_id exist or not missing/undefined/null

  if (answer.trim() === "") {
    return res.status(StatusCodes.BAD_REQUEST).json({
      msg: "Answer cannot be empty",
    });
  }
  // Checks if the answer is only whitespace after trimming.ca't be empty

  try {
    const [questionCheck] = await dbConnection.execute(
      "SELECT questionid FROM questions WHERE questionid = ?",
      [question_id]
    );
    // Queries the database to verify the question exists. Uses parameterized query to prevent SQL injection. The [questionCheck] destructures the first element from the result array.
    if (questionCheck.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        msg: "Question not found",
      });
    }
    //Checks if the query returned no results (question doesn't exist).

    const sql = `INSERT INTO answers (userid, questionid, answer) VALUES (?, ?, ?)`;
    // SQL query to insert new answer into database. Defines the SQL query to insert a new answer. The ? are placeholders for parameters.

    await dbConnection.execute(sql, [userid, question_id, answer]);
    // Executes the INSERT query with the provided values, replacing the ? placeholders.

    return res.status(StatusCodes.CREATED).json({
      msg: "Answer posted successfully",
    });
    // Send success response (201 = Created)
  } catch (error) {
    console.error("Error posting answer:", error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      msg: "An unexpected error occurred.",
      error: error.message,
    });
  }
}

// GET - Get all answers for a specific question (PUBLIC - NO AUTH)
async function getAnswersByQuestion(req, res) {
  const { questionid } = req.params;
  // Get question ID from URL parameter

  if (!questionid) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      msg: "Question ID is required",
    });
  }
  // Checks if questionid is missing.
  try {
    const [questionCheck] = await dbConnection.execute(
      "SELECT questionid FROM questions WHERE questionid = ?",
      [questionid]
    );
    // Verifies the question exists in the database.

    if (questionCheck.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        msg: "Question not found",
      });
    }
    // Checks if question wasn't found.
    const [answers] = await dbConnection.execute(
      `SELECT 
        a.answerid,
        a.answer,
        a.questionid,
        u.userid,
        u.username
      FROM answers a
      LEFT JOIN users u ON a.userid = u.userid
      WHERE a.questionid = ?
      ORDER BY a.answerid DESC`,
      [questionid]
    );
    // Query database to get all answers for this question
    // LEFT JOIN gets username from users table
    // ORDER BY answerid DESC shows newest answers first
    // Queries the database for all answers to this question. Uses LEFT JOIN to get the username from the users table. Orders results by answerid in descending order (newest first).
    return res.status(StatusCodes.OK).json({
      questionid: questionid,
      answers: answers,
    });
    // Send back all answers as JSON with questionid included
  } catch (error) {
    console.error("Error fetching answers:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      msg: "An unexpected error occurred.",
      error: error.message,
    });
  }
}

module.exports = {
  createAnswer,
  getAnswersByQuestion,
};
