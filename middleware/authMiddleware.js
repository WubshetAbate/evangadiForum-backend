const { StatusCodes } = require("http-status-codes");
const jwt = require("jsonwebtoken");
// StatusCodes for HTTP response codes (like 401 for unauthorized) and jwt for handling JSON Web Tokens (a secure way to verify user identity).
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  // Creating the middleware function: This is a checkpoint function. It checks if the user is authenticated next = function to call if authentication passes.
  //  Looking for authentication info in the request headers
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ msg: "Authentication invalid" });
  }
  // Making sure the header exists AND starts with "Bearer "
  // Extract token from "Bearer <token>"
  const token = authHeader.split(" ")[1];
  console.log(authHeader);
  console.log(token);
  // The header looks like "Bearer xyz123token", so we split by space and take the second part [1] (the actual token, since [0] would be "Bearer").
  try {
    const { username, userid } = jwt.verify(
      token,
      process.env.JWT_SECRET || "secret"
    );
    req.user = { username, userid };
    next();
  } catch (error) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ msg: "Authentication invalid" });
  }
}
// Verifying the token: Using the JWT library to check if the token is valid and hasn't been tampered with. It uses a secret key (stored in environment variables) to decode and verify. If successful, it extracts username and userid from the token.
module.exports = authMiddleware;
