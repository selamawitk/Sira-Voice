import React, { useEffect, useContext } from 'react';
import { AuthContext } from './AuthContextInstance.jsx';
import { setupPushNotifications } from '../services/pushService.js';

export const PushNotificationProvider = ({ children }) => {
  const auth = useContext(AuthContext);

  useEffect(() => {
    if (auth?.isAuthenticated) {
      setupPushNotifications();
    }
  }, [auth?.isAuthenticated]);

  return children;
};
