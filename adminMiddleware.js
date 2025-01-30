const { verifyToken } = require('./auth');
const pool = require('./db');  // Assuming this is your DB connection pool

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  const token = req.headers['authorization'];

  if (!token) {
    return res.status(401).json({ message: 'Token required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  // Check if user is an admin
  if (decoded.user_type !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admins only.' });
  }

  // If user is an admin, proceed to the next middleware or route handler
  next();
};

// Middleware to check if user is a seller
const isSeller = async (req, res, next) => {
  const token = req.headers['authorization'];

  
  if (!token) {
    return res.status(403).json({ message: "Access denied, no token provided." });
  }

  try {
    const decoded = verifyToken(token);
    
    // Assuming verifyToken is a function that decodes and verifies the token
    if (!decoded) {
      return res.status(400).json({ message: "Invalid token decoded." });
    }
    
    // Assuming 'decoded.userId' gives the user ID from the token
    const  {rows}  = await pool.query('SELECT * FROM agro_users WHERE id = $1', [decoded.id]);
  

    if (!rows.length || rows[0].user_type !== 'Seller') {
      return res.status(403).json({ message: "You must be a seller to perform this action." });
    }

    req.user = rows[0]; // Attach the user info to the request object
    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    return res.status(400).json({ message: "Invalid token"});
  }
};

module.exports = { isAdmin, isSeller };
