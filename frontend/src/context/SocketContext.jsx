import React, { useEffect, useContext, useMemo } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContextInstance.jsx';
import { SocketContext } from './SocketContextInstance.jsx';

export const SocketProvider = ({ children }) => {
  const auth = useContext(AuthContext);
  const userId = auth?.user?._id;

  const socketInstance = useMemo(() => {
    if (!userId) return null;

    const socketUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
    
    return io(socketUrl, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    });
  }, [userId]);

  useEffect(() => {
    if (!socketInstance || !userId) return;

    const handleConnect = () => {
      socketInstance.emit('join_user', userId);
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