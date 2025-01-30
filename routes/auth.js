const express = require('express');
const router = express.Router();
const pool = require('../db');  // Import your PostgreSQL pool
const { hashPassword, comparePassword, generateToken, verifyToken } = require('../auth'); // Import auth utilities

// Register route
router.post('/register', async (req, res) => {
  const { number, password, username, user_type } = req.body;

  if (!number || !password || !username) {
    return res.status(400).json({ message: 'number, password, and username are required' });
  }

  try {
    // Check if user or username already exists
    const existingUser = await pool.query('SELECT * FROM agro_users WHERE number = $1 OR username = $2', [number, username]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'User with that number or username already exists' });
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Insert user into the database
    const result = await pool.query(
      'INSERT INTO agro_users (number, password, username, user_type) VALUES ($1, $2, $3, $4) RETURNING id, number, username, user_type, created_at',
      [number, hashedPassword, username, user_type]
    );

    const user = result.rows[0];
    res.status(201).json({ message: 'User registered successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
});

// Login route
router.post('/login', async (req, res) => {
  const { number, password, username } = req.body;

  if ((!number && !username) || !password) {
    return res.status(400).json({ message: 'number or username, and password are required' });
  }

  try {
    // Find user by number or username
    const result = await pool.query(
      'SELECT * FROM agro_users WHERE number = $1 OR username = $2',
      [number || '', username || '']
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ message: 'Invalid number/username or password' });
    }

    // Compare passwords
    const validPassword = await comparePassword(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Invalid number/username or password' });
    }

    // Generate JWT token
    const token = generateToken({ id: user.id, number: user.number, user_type: user.user_type });

    // Send token along with user info in response
    res.json({
      message: 'Login successful',
      token,
      id:user.id,
      number: user.number,
      username: user.username,
      user_type: user.user_type,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

// Protected route for logged-in users
router.get('/dashboard', (req, res) => {
  const token = req.headers['authorization'];

  if (!token) {
    return res.status(401).json({ message: 'Token required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  res.json({ message: 'Welcome to the dashboard!', user: decoded });
});

// Admin-only route
router.get('/admin-dashboard', (req, res) => {
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

  res.json({ message: 'Welcome to the admin dashboard!', user: decoded });
});

module.exports = router;
