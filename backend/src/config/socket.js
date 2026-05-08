import { Server } from 'socket.io';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        process.env.FRONTEND_URL || 'http://localhost:5173',
        'http://localhost:3000',
        'http://192.168.1.100:3000'
      ],
      methods: ['GET', 'POST'],
      credentials: true
    },
  });

  io.on('connection', (socket) => {
    console.log('🚀 Socket connected:', socket.id);

    socket.on('join', (userId) => {
      if (userId) {
        socket.join(userId.toString());
        console.log(`👤 User ${userId} joined room`);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`❌ Socket disconnected (${reason}):`, socket.id);
    });

    socket.on('error', (err) => {
      console.error('⚠️ Socket Error:', err);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};