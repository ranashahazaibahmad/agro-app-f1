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

    // Insert the new bid
    const bidResult = await pool.query(
      'INSERT INTO bids (user_id, ad_id, bid_price) VALUES ($1, $2, $3) RETURNING *',
      [user_id, ad_id, price]
    );

    // Update the total_bid count for the user
    await pool.query(
      'UPDATE agro_users SET total_bid = total_bid + 1 WHERE id = $1',
      [user_id]
    );

    res.json(bidResult.rows[0]);
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
        `SELECT bids.*, agro_ads.image1_url, agro_users.profile_pic , agro_users.username
      FROM bids 
      JOIN agro_ads ON bids.ad_id = agro_ads.id 
      JOIN agro_users ON bids.user_id = agro_users.id
      ORDER BY ${sortBy} ${sortOrder}, bid_price ${priceSortOrder}`
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
    const result = await pool.query(`SELECT bids.*, 
          agro_ads.image1_url, 
          agro_users.profile_pic, 
          agro_users.username 
   FROM bids
   JOIN agro_ads ON bids.ad_id = agro_ads.id
   JOIN agro_users ON bids.user_id = agro_users.id
   WHERE bids.id = $1`, [id]);
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
      `SELECT bids.*, 
              agro_ads.image1_url, 
              agro_users.profile_pic, 
              agro_users.username
       FROM bids
       JOIN agro_ads ON bids.ad_id = agro_ads.id
       JOIN agro_users ON bids.user_id = agro_users.id
       WHERE bids.user_id = $1`, 
      [userId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'No bids found for this user' });

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get all bids for a specific ad by ad_id
router.get('/ad/:adId', async (req, res) => {
  try {
    const { adId } = req.params;
    const result = await pool.query(
      `SELECT bids.*, 
              agro_ads.image1_url, 
              agro_users.profile_pic, 
              agro_users.username
       FROM bids
       JOIN agro_ads ON bids.ad_id = agro_ads.id
       JOIN agro_users ON bids.user_id = agro_users.id
       WHERE bids.ad_id = $1`, 
      [adId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'No bids found for this ad' });

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.put('/select-winner/:bidId' , isSeller, async (req, res) => {
  try {
    const { bidId } = req.params;

    // Get bid details
    const bidResult = await pool.query('SELECT * FROM bids WHERE id = $1', [bidId]);
    if (bidResult.rows.length === 0) return res.status(404).json({ error: 'Bid not found' });

    const bid = bidResult.rows[0];

    // Check if the requesting user is the owner of the ad
    const adOwnerResult = await pool.query('SELECT user_id FROM agro_ads WHERE id = $1', [bid.ad_id]);
    if (adOwnerResult.rows.length === 0) return res.status(404).json({ error: 'Ad not found' });

    const adOwner = adOwnerResult.rows[0].user_id;
    if (req.user.id !== adOwner) return res.status(403).json({ error: 'You are not authorized to select a winner' });

    // Mark all bids for this ad as not winners
    await pool.query('UPDATE bids SET winner = FALSE WHERE ad_id = $1', [bid.ad_id]);

    // Mark the selected bid as the winner
    await pool.query('UPDATE bids SET winner = TRUE WHERE id = $1 RETURNING *', [bidId]);

    res.json({ message: 'Bid selected as the winner', winnerBid: bidId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/winner/:adId', async (req, res) => {
  try {
    const { adId } = req.params;

    // Query to get the winning bid for the given ad
    const result = await pool.query(
      `SELECT bids.*, agro_ads.image1_url, agro_users.profile_pic, agro_users.username
       FROM bids
       JOIN agro_ads ON bids.ad_id = agro_ads.id
       JOIN agro_users ON bids.user_id = agro_users.id
       WHERE bids.ad_id = $1 AND bids.winner = TRUE`,
      [adId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'No winning bid found for this ad' });

    res.json(result.rows[0]); // Return the winning bid details
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
