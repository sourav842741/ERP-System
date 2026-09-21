let ioInstance = null;

export const initSocket = (io) => {
  ioInstance = io;
  io.on('connection', (socket) => {
    // Join standard rooms
    socket.on('join_room', (room) => {
      socket.join(room);
    });

    socket.on('leave_room', (room) => {
      socket.leave(room);
    });
  });
};

export const getIO = () => ioInstance;

export const emitSocketEvent = (event, data, room = null) => {
  if (!ioInstance) return;
  if (room) {
    ioInstance.to(room).emit(event, data);
  } else {
    ioInstance.emit(event, data);
  }
};
