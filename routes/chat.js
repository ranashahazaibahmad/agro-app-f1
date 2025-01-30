module.exports = (app, io) => {
    const messages = [];
  
    io.on("connection", (socket) => {
      console.log("⚡ A user connected");
  
      // Send chat history to the newly connected user
      socket.emit("chat history", messages);
  
      socket.on("chat message", (msg) => {
        console.log("📩 New Message:", msg);
        messages.push(msg);
        io.emit("chat message", msg); // Broadcast message
      });
  
      socket.on("disconnect", () => {
        console.log("🔴 User disconnected");
      });
    });
  
    // API Endpoint to Get Messages
    app.get("/api/messages", (req, res) => {
      res.json({ messages });
    });
  
    // API Endpoint to Send a Message
    app.post("/api/messages", (req, res) => {
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message content is required" });
      }
      messages.push(message);
      io.emit("chat message", message); // Broadcast to all users
      res.status(201).json({ message });
    });
  };
  