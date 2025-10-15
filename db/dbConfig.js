const mysql2 = require("mysql2");

const dbConnection = mysql2.createPool({
  user: process.env.DB_USER || process.env.USER,
  database: process.env.DB_NAME || process.env.DATABASE,
  host: process.env.DB_HOST || "localhost",
  password: process.env.DB_PASSWORD || process.env.PASSWORD,
  port: process.env.DB_PORT || 3306,
  connectionLimit: 10,
});

module.exports = dbConnection.promise();
