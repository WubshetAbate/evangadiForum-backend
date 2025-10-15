const express = require("express");
const dbConnection = require("../db/dbConfig");
const { StatusCodes } = require("http-status-codes");

// POST - Create a new question (REQUIRES AUTH)
async function createQuestion(req, res) {
  const { question, question_description, tag } = req.body;
  const userid = req.user.userid;
  // Extract question data from 3 properties from the request body
  // Get the user's ID (provided by authMiddleware after login verification)
  //   req.user: User information added by authentication middleware
  // .userid: The specific user ID property

  if (!question || !question_description) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      msg: "Please provide all required fields",
    });
  }
  // Check if question and description exist

  if (question.trim() === "" || question_description.trim() === "") {
    return res.status(StatusCodes.BAD_REQUEST).json({
      msg: "Question and description cannot be empty",
    });
  }
  // Check if fields are not just empty spaces
  //   question.trim(): Removes whitespace from beginning and end of question string
  //   question_description.trim(): Removes whitespace from description

  try {
    const questionid = `Q${Date.now()}${Math.random()
      .toString(36)
      //   Converts number to base-36 string (uses digits 0-9 and letters a-z)
      .substring(2, 9)}`;
    //   Extracts characters from position 2 to 9
    // Generate a unique ID for the question
    // Date.now(): Returns current timestamp in milliseconds
    // Math.random(): Generates random decimal between 0 and 1

    const sql = `
      INSERT INTO questions (questionid, userid, title, description, tag) 
      VALUES (?, ?, ?, ?, ?)
    `;
    // SQL query to insert new question into database

    await dbConnection.execute(sql, [
      questionid,
      userid,
      question,
      question_description,
      tag || null,
    ]);
    // await: Pauses execution until promise resolves
    // Execute the SQL query
    //  Starts an array of values
    // tag || null means if tag doesn't exist

    return res.status(StatusCodes.CREATED).json({
      msg: "Question created successfully",
      questionid: questionid,
    });
    // Send success response (201 = Created)
    // Return the new question ID
  } catch (error) {
    console.error("Error creating question:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      msg: "An unexpected error occurred.",
      error: error.message,
    });
  }
}

// GET - Get all questions (PUBLIC - NO AUTH)
async function getAllQuestions(req, res) {
  try {
    const [rows] = await dbConnection.execute(`
      SELECT q.id, q.questionid, q.title, q.description, q.tag, u.username 
      FROM questions q 
      JOIN users u ON q.userid = u.userid 
      
      ORDER BY q.id DESC
    `);
    // const [rows]: Destructuring to get first element of returned array
    // Query database to get all questions
    // JOIN gets username from users table
    // ORDER BY id DESC shows newest questions first
    // q: Alias (short name) for questions table
    // JOIN: Combines rows from two tables
// users: Second table name
// u: Alias for users table
// ON: Specifies join condition
// q.userid = u.userid: Match records where userids are equal
    return res.status(StatusCodes.OK).json({ questions: rows });
    // Send back all questions as JSON
  } catch (error) {
    console.error("Error fetching questions:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      msg: "Error fetching questions",
      error: error.message,
    });
  }
}

// GET - Get single question (PUBLIC - NO AUTH)
async function getSingleQuestion(req, res) {
  const { questionid } = req.params;
  // Get question ID from URL parameter

  try {
    const [rows] = await dbConnection.execute(
      `
      SELECT q.id, q.questionid, q.title, q.description, q.tag, u.username 
      FROM questions q 
      JOIN users u ON q.userid = u.userid 
      WHERE q.questionid = ?
    `,
      [questionid]
    );
    //     WHERE: SQL filter condition
    // q.questionid: Column to check
    // = ?: Placeholder for the value to match
    // Query for ONE specific question matching the ID

    if (rows.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        msg: "Question not found",
      });
    }
    // Strict equality check - no rows found that means no question found, send 404 error

    return res.status(StatusCodes.OK).json({ question: rows[0] });
    // Send back the first (and only) question found result from the array
  } catch (error) {
    console.error("Error fetching question:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      msg: "Error fetching question",
      error: error.message,
    });
  }
}

module.exports = { createQuestion, getAllQuestions, getSingleQuestion };
