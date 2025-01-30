  const express = require('express');
  const http = require('http');  // Import HTTP module
  const socketIo = require('socket.io');
  const path = require('path');
  const bodyParser = require('body-parser');

  const app = express();
  const server = http.createServer(app); // Create an HTTP server
  const io = socketIo(server, {
    cors: {
      origin: '*', // Allow all origins, update as needed
      methods: ['GET', 'POST'],
    },
  });

  const port = 3000;

  // Import routes
  const weatherRoute = require('./routes/weather');  // Weather route
  const authRoute = require('./routes/auth');        // Auth route
  const agroProductRoutes = require('./routes/agroProductRoutes');
  const agroAdRoutes = require('./routes/agroAdRoutes');
  const profileRoutes = require('./routes/profile');
  const bidRoutes = require('./routes/bids');
 
  // Middlewar e
  app.use(bodyParser.json());

  // Serve static files from the 'uploads' folder
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  // Use routes
  app.use('/weather', weatherRoute);
  app.use('/auth', authRoute);
  app.use('/products', agroProductRoutes);
  app.use('/ad', agroAdRoutes);
  app.use('/profile', profileRoutes);
  app.use('/bids', bidRoutes);


// Load Socket.io Features
require("./routes/chat")(app, io); // 🔥 Chat WebSocket + API
require("./socket")(io);


  // Start Server
  server.listen(port, () => {
    console.log(`🚀 Server is running on http://localhost:${port}`);
  });
