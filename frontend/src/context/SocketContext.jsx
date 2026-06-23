import React, { useEffect, useContext, useMemo } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContextInstance.jsx';
import { SocketContext } from './SocketContextInstance.jsx';
import { baseAPI } from '../services/api.js';

export const SocketProvider = ({ children }) => {
  const auth = useContext(AuthContext);
  const userId = auth?.user?._id;
  const token = localStorage.getItem('token');

  const socketInstance = useMemo(() => {
    if (!userId || !token) return null;

    const socketUrl = import.meta.env.VITE_BACKEND_URL || baseAPI.replace(/\/api$/, '');

    return io(socketUrl, {
      auth: { token },
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    });
  }, [userId, token]);

  useEffect(() => {
    if (!socketInstance || !userId) return;

    const handleConnect = () => {
      socketInstance.emit('join', userId);
    };

    socketInstance.on('connect', handleConnect);
    socketInstance.connect();

    return () => {
      socketInstance.off('connect', handleConnect);
      socketInstance.disconnect();
    };
  }, [socketInstance, userId]);

  return (
    <SocketContext.Provider value={socketInstance}>
      {children}
    </SocketContext.Provider>
  );
};
