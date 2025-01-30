const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken, hashPassword } = require('../auth');
const multer = require('multer');
const streamifier = require('streamifier');
const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Read Profile
router.get('/', async (req, res) => {
  const token = req.headers['authorization'];

  if (!token) {
    return res.status(401).json({ message: 'Token required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  try {
    const result = await pool.query(
      `SELECT id, number, username, user_type, created_at, updated_at, profile_pic, dob, region, total_bid, name, email 
       FROM agro_users WHERE id = $1`,
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = result.rows[0];
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
});

router.get('/all', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];

    

    const token = authHeader;

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      return res.status(401).json({ message: 'Invalid token', error: error.message });
    }

    const query = `
      SELECT id, number, username, user_type, created_at, updated_at, 
             profile_pic, dob, region, total_bid, name, email 
      FROM agro_users ORDER BY total_bid DESC
    `;

    const result = await pool.query(query);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No users found' });
    }

    res.json({ users: result.rows });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// Update Profile with Image Upload
router.put('/', upload.single('profile_pic'), async (req, res) => {
  const token = req.headers['authorization'];
  const { username, password, user_type, dob, region, name, email } = req.body;

  if (!token) {
    return res.status(401).json({ message: 'Token required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  try {
    let updatedFields = [];
    let values = [];

    if (username) {
      updatedFields.push('username = $' + (updatedFields.length + 1));
      values.push(username);
    }
    if (password) {
      const hashedPassword = await hashPassword(password);
      updatedFields.push('password = $' + (updatedFields.length + 1));
      values.push(hashedPassword);
    }
    if (user_type) {
      updatedFields.push('user_type = $' + (updatedFields.length + 1));
      values.push(user_type);
    }
    if (dob) {
      updatedFields.push('dob = $' + (updatedFields.length + 1));
      values.push(dob);
    }
    if (region) {
      updatedFields.push('region = $' + (updatedFields.length + 1));
      values.push(region);
    }
    if (total_bid) {
      updatedFields.push('total_bid = $' + (updatedFields.length + 1));
      values.push(total_bid);
    }
    if (name) {
      updatedFields.push('name = $' + (updatedFields.length + 1));
      values.push(name);
    }
    if (email) {
      updatedFields.push('email = $' + (updatedFields.length + 1));
      values.push(email);
    }

    let profilePicUrl = null;
    if (req.file) {
      profilePicUrl = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: 'profile_pics' },
          (error, result) => {
            if (error) return reject(error);
            resolve(result.secure_url);
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
      });

      updatedFields.push('profile_pic = $' + (updatedFields.length + 1));
      values.push(profilePicUrl);
    }

    if (updatedFields.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    const query =
      'UPDATE agro_users SET ' +
      updatedFields.join(', ') +
      ', updated_at = CURRENT_TIMESTAMP WHERE id = $' + (updatedFields.length + 1) + ' RETURNING *';
    values.push(decoded.id);

    const result = await pool.query(query, values);

    const updatedUser = result.rows[0];
    res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
});

// Delete Profile
router.delete('/', async (req, res) => {
  const token = req.headers['authorization'];

  if (!token) {
    return res.status(401).json({ message: 'Token required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  try {
    const result = await pool.query('DELETE FROM agro_users WHERE id = $1 RETURNING id', [decoded.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Profile deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting profile', error: error.message });
  }
});

module.exports = router;
