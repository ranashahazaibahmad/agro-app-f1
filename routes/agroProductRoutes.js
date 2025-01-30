const express = require('express');
const router = express.Router();
const pool = require('../db');
const { isAdmin } = require('../adminMiddleware');
// ===========================
// PRODUCT CRUD ROUTES
// ===========================

// 1. Create a new product (POST) - Admin only
router.post('/', isAdmin, async (req, res) => {
  const { name, price, sale_price, image1, image2, image3 } = req.body;

  // Validate required fields
  if (!name || !price || !sale_price) {
    return res.status(400).json({ message: 'Name, price, and sale price are required.' });
  }

  // Validate image URLs if provided
  if ((image1 && !isValidUrl(image1)) || (image2 && !isValidUrl(image2)) || (image3 && !isValidUrl(image3))) {
    return res.status(400).json({ message: 'Invalid image URL(s).' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO agro_product (name, price, image1, image2, image3, sale_price) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, price, image1, image2, image3, sale_price]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Get all products (GET) - Public route
router.get('/', async (req, res) => {
  const { search, sortBy, order } = req.query;  // Query parameters: search, sortBy (name, price), order (asc, desc)

  let query = 'SELECT * FROM agro_product';
  const queryParams = [];

  // Search functionality (filter by name)
  if (search) {
    queryParams.push(`%${search}%`);
    query += ` WHERE name ILIKE $${queryParams.length}`;
  }

  // Sorting functionality (by name, price, or other fields)
  if (sortBy) {
    const sortOrder = order === 'desc' ? 'DESC' : 'ASC';  // Default to ASC if no order is specified
    query += ` ORDER BY ${sortBy} ${sortOrder}`;
  }

  try {
    const result = await pool.query(query, queryParams);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Get a single product by ID (GET) - Public route
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('SELECT * FROM agro_product WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Update a product by ID (PUT) - Admin only
router.put('/:id', isAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, price, sale_price, image1, image2, image3 } = req.body;

  // Validate required fields
  if (!name && !price && !sale_price && !image1 && !image2 && !image3) {
    return res.status(400).json({ message: 'At least one field must be provided to update.' });
  }

  // Validate image URLs if provided
  if ((image1 && !isValidUrl(image1)) || (image2 && !isValidUrl(image2)) || (image3 && !isValidUrl(image3))) {
    return res.status(400).json({ message: 'Invalid image URL(s).' });
  }

  try {
    // Get the current product data to preserve existing values where necessary
    const currentProduct = await pool.query('SELECT * FROM agro_product WHERE id = $1', [id]);

    if (currentProduct.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Use COALESCE to only update fields that are provided, and retain existing values for others
    const result = await pool.query(
      `UPDATE agro_product 
      SET 
        name = COALESCE($1, name), 
        price = COALESCE($2, price), 
        image1 = COALESCE($3, image1), 
        image2 = COALESCE($4, image2), 
        image3 = COALESCE($5, image3), 
        sale_price = COALESCE($6, sale_price)
      WHERE id = $7 
      RETURNING *`,
      [
        name || currentProduct.rows[0].name,
        price || currentProduct.rows[0].price,
        image1 || currentProduct.rows[0].image1,
        image2 || currentProduct.rows[0].image2,
        image3 || currentProduct.rows[0].image3,
        sale_price || currentProduct.rows[0].sale_price,
        id
      ]
    );

    res.json(result.rows[0]);  // Return the updated product data
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Delete a product by ID (DELETE) - Admin only
router.delete('/:id', isAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM agro_product WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully', product: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to validate URLs
const isValidUrl = (url) => {
  const regex = /^(ftp|http|https):\/\/[^ "]+$/;
  return regex.test(url);
};

module.exports = router;
