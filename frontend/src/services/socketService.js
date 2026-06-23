import { io } from 'socket.io-client';
import { baseAPI } from './api.js';

let socket = null;

const getBackendUrl = () => baseAPI.replace(/\/api\/?$/, '');

const getToken = () => localStorage.getItem('token');

export const connectSocket = (userId) => {
  const token = getToken();

  if (socket?.connected) {
    if (userId) {
      socket.emit('join', userId);
    }
    return socket;
  }

  if (socket) {
    socket.disconnect();
  }

  socket = io(getBackendUrl(), {
    auth: { token },
    withCredentials: true,
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connect error:', err);
  });

  socket.on('connect', () => {
    if (userId) {
      socket.emit('join', userId);
    }
  });

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
