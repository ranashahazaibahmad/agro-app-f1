const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const port = 3000;
// Import routes
const weatherRoute = require('./routes/weather');  // Weather route
const authRoute = require('./routes/auth');        // Auth route
const agroProductRoutes = require('./routes/agroProductRoutes');
const agroAdRoutes = require('./routes/agroAdRoutes'); // Import the agroAdRoutes file
const profileRoutes = require('./routes/profile'); // Import the profile routes
const bidRoutes = require('./routes/bids'); // Import the profile routes



// Middleware
app.use(bodyParser.json()); // Parse incoming JSON requests

// Serve static files from the 'uploads' folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Use routes
app.use('/weather', weatherRoute); // Existing weather route
app.use('/auth', authRoute);       // Auth route for registration, login, etc.
app.use('/products', agroProductRoutes);
app.use('/ad', agroAdRoutes);
app.use('/profile', profileRoutes);
app.use('/bids', bidRoutes);



app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
