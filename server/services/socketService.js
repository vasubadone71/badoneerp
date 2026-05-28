let io;

const init = (socketIoInstance) => {
  io = socketIoInstance;
  
  io.on('connection', (socket) => {
    console.log(`[Socket.io] New client connected: ${socket.id}`);
    
    // Future live sync events can be handled here
    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });
};

const getIo = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

// Example function to broadcast data changes
const emitDataChange = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

module.exports = {
  init,
  getIo,
  emitDataChange
};
