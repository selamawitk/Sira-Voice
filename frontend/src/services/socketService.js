import { io } from 'socket.io-client';

let socket = null;

const getBackendUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
  return apiUrl.replace(/\/api\/?$/, '');
};

export const connectSocket = (userId) => {
  if (!socket) {
    socket = io(getBackendUrl(), {
      transports: ['websocket'],
      withCredentials: true,
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connect error:', err);
    });
  }

  if (userId) {
    socket.emit('join', userId);
  }

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    throw new Error('Socket has not been initialized. Call connectSocket(userId) first.');
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
