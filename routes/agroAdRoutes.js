const express = require('express');
const pool = require('../db');  // Import your PostgreSQL pool
const { isSeller } = require('../adminMiddleware'); // Import the isSeller middleware
const router = express.Router();
const streamifier = require('streamifier');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer configuration to buffer files
const storage = multer.memoryStorage();
const upload = multer({ storage });
// POST: Create a new ad
// POST: Create a new ad with image uploads
router.post('/' , isSeller , upload.array('images', 3), async (req, res) => {
  const { ad_title, ad_price, ad_weight, ad_location, ad_delivery, category } = req.body;
  const { id } = req.user; // Authenticated seller's ID

  try {
    // Upload images to Cloudinary and get URLs
    const imageUrls = await Promise.all(
      req.files.map(file => {
        return new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'ads' },
            (error, result) => {
              if (error) return reject(error);
              resolve(result.secure_url);
            }
          );
          streamifier.createReadStream(file.buffer).pipe(uploadStream);
        });
      })
    );

    // Save the ad details and image URLs in the database
    const result = await pool.query(
      `INSERT INTO agro_ads (user_id, ad_title, ad_price, ad_weight, ad_location, ad_delivery, image1_url, image2_url, image3_url, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        id, ad_title, ad_price, ad_weight, ad_location, ad_delivery,
        imageUrls[0] || null, imageUrls[1] || null, imageUrls[2] || null, category
      ]
    );

    res.status(201).json({ ad: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create ad.', error });
  }
});

// GET: Retrieve all ads for the logged-in seller
router.get('/', isSeller , async (req, res) => {
  const { id } = req.user; // From the authenticated seller
  console.log(req.user);
  

  try {
    const result = await pool.query('SELECT * FROM agro_ads WHERE user_id = $1', [id]);
    res.status(200).json({ ads: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to retrieve ads.' });
  }
});



router.get('/all', async (req, res) => {
  try {
    const { category, min_price, max_price, sort_by, sort_order, search } = req.query;

    // Base query to fetch all ads with user details
    let query = `
      SELECT 
        agro_ads.*, 
        agro_users.id AS user_id, 
        agro_users.username AS seller_name, 
        agro_users.number AS seller_email, 
        agro_users.user_type AS seller_user_type,
        COALESCE(
          (SELECT winner FROM bids WHERE bids.ad_id = agro_ads.id AND winner = TRUE LIMIT 1),
          FALSE
        ) AS has_winner
      FROM 
        agro_ads
      JOIN 
        agro_users ON agro_ads.user_id = agro_users.id
    `;
    
    // This will hold the dynamic conditions
    const conditions = [];
    const queryParams = [];

    // Filter by category if provided
    if (category) {
      conditions.push(`agro_ads.category = $${queryParams.length + 1}`);
      queryParams.push(category);
    }

    // Filter by price range if provided
    if (min_price) {
      conditions.push(`agro_ads.ad_price >= $${queryParams.length + 1}`);
      queryParams.push(min_price);
    }
    if (max_price) {
      conditions.push(`agro_ads.ad_price <= $${queryParams.length + 1}`);
      queryParams.push(max_price);
    }

    // Search ads by title or description if provided
    if (search) {
      conditions.push(`(agro_ads.ad_title ILIKE $${queryParams.length + 1} OR agro_ads.ad_description ILIKE $${queryParams.length + 2})`);
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    // Add the WHERE clause if there are any conditions
    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    // Sorting logic based on sort_by and sort_order
    let orderBy = '';
    if (sort_by) {
      const validSortColumns = ['ad_price', 'ad_title', 'ad_location', 'ad_weight'];
      if (validSortColumns.includes(sort_by)) {
        orderBy = ` ORDER BY agro_ads.${sort_by}`;
      } else {
        return res.status(400).json({ message: 'Invalid sort column.' });
      }
    }

    // Only apply the order by if it's specified
    if (orderBy && sort_order && ['ASC', 'DESC'].includes(sort_order.toUpperCase())) {
      orderBy += ` ${sort_order.toUpperCase()}`;
    }

    // Append the order by clause if present
    query += orderBy;

    // Execute the query with parameters
    const result = await pool.query(query, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No ads found.' });
    }

    // Return the ads with user details
    res.status(200).json({ ads: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to retrieve ads.' });
  }
});



// router.get('/all', async (req, res) => {
//   try {
//     const { category, min_price, max_price, sort_by, sort_order, search } = req.query;

//     // Base query to fetch all ads with user details
//     let query = `
//       SELECT 
//         agro_ads.*, 
//         agro_users.id AS user_id, 
//         agro_users.username AS seller_name, 
//         agro_users.number AS seller_email, 
//         agro_users.user_type AS seller_user_type
//       FROM 
//         agro_ads
//       JOIN 
//         agro_users ON agro_ads.user_id = agro_users.id
//     `;
    
//     // This will hold the dynamic conditions
//     const conditions = [];
//     const queryParams = [];

//     // Filter by category if provided
//     if (category) {
//       conditions.push(`agro_ads.category = $${queryParams.length + 1}`);
//       queryParams.push(category);
//     }

//     // Filter by price range if provided
//     if (min_price) {
//       conditions.push(`agro_ads.ad_price >= $${queryParams.length + 1}`);
//       queryParams.push(min_price);
//     }
//     if (max_price) {
//       conditions.push(`agro_ads.ad_price <= $${queryParams.length + 1}`);
//       queryParams.push(max_price);
//     }

//     // Search ads by title or description if provided
//     if (search) {
//       conditions.push(`(agro_ads.ad_title ILIKE $${queryParams.length + 1} OR agro_ads.ad_description ILIKE $${queryParams.length + 2})`);
//       queryParams.push(`%${search}%`, `%${search}%`);
//     }

//     // Add the WHERE clause if there are any conditions
//     if (conditions.length > 0) {
//       query += ` WHERE ` + conditions.join(' AND ');
//     }

//     // Sorting logic based on sort_by and sort_order
//     let orderBy = '';
//     if (sort_by) {
//       const validSortColumns = ['ad_price', 'ad_title', 'ad_location', 'ad_weight'];
//       if (validSortColumns.includes(sort_by)) {
//         orderBy = ` ORDER BY agro_ads.${sort_by}`;
//       } else {
//         return res.status(400).json({ message: 'Invalid sort column.' });
//       }
//     }

//     // Only apply the order by if it's specified
//     if (orderBy && sort_order && ['ASC', 'DESC'].includes(sort_order.toUpperCase())) {
//       orderBy += ` ${sort_order.toUpperCase()}`;
//     }

//     // Append the order by clause if present
//     query += orderBy;

//     // Execute the query with parameters
//     const result = await pool.query(query, queryParams);

//     if (result.rows.length === 0) {
//       return res.status(404).json({ message: 'No ads found.' });
//     }

//     // Return the ads with user details
//     res.status(200).json({ ads: result.rows });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Failed to retrieve ads.' });
//   }
// });


router.get('/user/:id', async (req, res) => {
  const { id } = req.params; // Get the user ID from the URL parameter

  try {
    // Query to fetch all ads along with the corresponding user details for the given user ID
    const result = await pool.query(`
      SELECT 
        agro_ads.*, 
        agro_users.id AS user_id, 
        agro_users.username AS seller_name, 
        agro_users.number AS seller_email, 
        agro_users.user_type AS seller_user_type
      FROM 
        agro_ads
      JOIN 
        agro_users ON agro_ads.user_id = agro_users.id
      WHERE 
        agro_ads.user_id = $1  -- Filter by the provided user ID
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No ads found for this user.' });
    }

    // Return the ads with user details
    res.status(200).json({ ads: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to retrieve ads.' });
  }
});

router.get('/all/:id', async (req, res) => {
  const { id } = req.params;  // Get the ID from the route parameter

  try {
    // Query to fetch a single ad by its ID, along with the corresponding user details
    const result = await pool.query(`
      SELECT 
        agro_ads.*, 
        agro_users.id AS user_id, 
        agro_users.username AS seller_name, 
        agro_users.number AS seller_email, 
        agro_users.user_type AS seller_user_type
      FROM 
        agro_ads
      JOIN 
        agro_users ON agro_ads.user_id = agro_users.id
      WHERE
        agro_ads.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Ad not found.' });
    }

    // Return the ad along with user details
    res.status(200).json({ ad: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to retrieve ad.' });
  }
});

// PUT: Update an existing ad
router.put('/:sid', isSeller , async (req, res) => {
  const { sid } = req.params;
  const { ad_title, ad_price, ad_weight, ad_location, ad_delivery, image1_url, image2_url, image3_url } = req.body;
  const { id } = req.user; // From the authenticated seller

  try {
    // Update the ad with the provided data
    const result = await pool.query(
      `UPDATE agro_ads 
       SET ad_title = $1, ad_price = $2, ad_weight = $3, ad_location = $4, ad_delivery = $5, 
           image1_url = $6, image2_url = $7, image3_url = $8 
       WHERE id = $9 AND user_id = $10 RETURNING *`,
      [ad_title, ad_price, ad_weight, ad_location, ad_delivery, image1_url, image2_url, image3_url, sid, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Ad not found or you do not have permission to update it.' });
    }

    res.status(200).json({ ad: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update ad.' });
  }
});

// DELETE: Delete an existing ad
router.delete('/:sid', isSeller , async (req, res) => {
  const { sid } = req.params;
  const { id } = req.user; // From the authenticated seller

  try {
    // Delete the ad
    const result = await pool.query('DELETE FROM agro_ads WHERE id = $1 AND user_id = $2 RETURNING *', [sid, id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Ad not found or you do not have permission to delete it.' });
    }

    res.status(200).json({ message: 'Ad deleted successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete ad.' });
  }
});

module.exports = router;
