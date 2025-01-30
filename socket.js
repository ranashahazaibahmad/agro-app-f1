module.exports = (io) => {
    io.on("connection", (socket) => {
      console.log(`⚡ New connection: ${socket.id}`);
  
      socket.on("newAd", (adData) => {
        console.log("📢 New Ad Posted:", adData);
        io.emit("updateAds", adData);
      });
  
      socket.on("newBid", (bidInfo) => {
        console.log("🔥 New Bid Placed:", bidInfo);
        io.emit("bidUpdate", bidInfo);
      });
  
      socket.on("disconnect", () => {
        console.log(`🔴 User disconnected: ${socket.id}`);
      });
    });
  };
      