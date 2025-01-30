const express = require('express');
const pool = require('../db');  // Import your PostgreSQL pool
const { isSeller } = require('../adminMiddleware'); // Import the isSeller middleware
const router = express.Router();
const streamifier = require('streamifier');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');



// Create a new bid
router.post('/', async (req, res) => {
  try {
    const { user_id, ad_id, price } = req.body;
    const result = await pool.query(
      'INSERT INTO bids (user_id, ad_id, bid_price) VALUES ($1, $2, $3) RETURNING *',
      [user_id, ad_id, price]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
  

  router.get('/', async (req, res) => {
    try {
      // Get sorting parameters from the query string (default values)
      const sortBy = req.query.sortBy || 'created_at';  // Default to 'created_at' if not provided
      const sortOrder = req.query.sortOrder || 'DESC';   // Default to 'DESC' if not provided
      const priceSortOrder = req.query.priceSortOrder || 'DESC'; // Default to 'DESC' for price sorting
  
      // Validate that sortBy is one of the allowed fields
      const allowedSortFields = ['created_at', 'bid_price'];
      if (!allowedSortFields.includes(sortBy)) {
        return res.status(400).json({ error: 'Invalid sort field' });
      }
  
      // Validate that sortOrder and priceSortOrder are either 'ASC' or 'DESC'
      const allowedOrders = ['ASC', 'DESC'];
      if (!allowedOrders.includes(sortOrder) || !allowedOrders.includes(priceSortOrder)) {
        return res.status(400).json({ error: 'Invalid sort order' });
      }
  
      // Query to fetch bids, with dynamic sorting
      const result = await pool.query(
        `SELECT bids.*, agro_ads.image1_url FROM bids 
        JOIN agro_ads ON bids.ad_id = agro_ads.id 
        ORDER BY bids.${sortBy} ${sortOrder}, bids.bid_price ${priceSortOrder}`
      );
  
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  

// Get a specific bid by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT bids.*, agro_ads.image1_url FROM bids ' +
      'JOIN agro_ads ON bids.ad_id = agro_ads.id ' + 
      'WHERE bids.id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Bid not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get all bids for a specific user by user_id
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      'SELECT bids.*, agro_ads.image1_url FROM bids ' +
      'JOIN agro_ads ON bids.ad_id = agro_ads.id ' + 
      'WHERE bids.user_id = $1', 
      [userId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'No bids found for this user' });

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// Update a bid
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { price } = req.body;
    const result = await pool.query(
      'UPDATE bids SET price = $1 WHERE id = $2 RETURNING *',
      [price, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Bid not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Delete a bid
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM bids WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Bid not found' });
    res.json({ message: 'Bid deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


module.exports = router;
