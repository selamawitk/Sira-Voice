import { useState, useEffect, useContext, useCallback } from 'react';
import { getMyNotifications, markAsRead, markAllAsRead } from '../services/notificationService.js';
import { connectSocket } from '../services/socketService.js';
import { AuthContext } from '../context/AuthContextInstance.jsx';
import { ToastContext } from '../components/ui/ToastContextInstance.jsx';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const auth = useContext(AuthContext);
  const toast = useContext(ToastContext);

  const fetchNotifications = useCallback(async () => {
    if (!auth.user?._id) return;
    try {
      setLoading(true);
      const data = await getMyNotifications();
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.isRead).length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [auth.user?._id]);

  const markNotificationAsRead = async (notificationId) => {
    try {
      await markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n =>
          n._id === notificationId ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  useEffect(() => {
    if (!auth.user?._id) return;

    fetchNotifications();

    const socket = connectSocket(auth.user._id);

    const handleNewNotification = (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
      toast?.show?.(notification.message, 'success');
    };

    const handleApplicationStatus = (data) => {
      const message = data.status === 'accepted'
        ? `Congratulations! Your application for "${data.jobTitle}" was accepted.`
        : `Update on your application for "${data.jobTitle}": ${data.status}`;

      const notification = {
        _id: Date.now().toString(),
        title: 'Application Update',
        message,
        type: 'system',
        isRead: false,
        createdAt: new Date().toISOString()
      };

      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
      toast?.show?.(message, 'info');
    };

    socket.on('notification', handleNewNotification);
    socket.on('application_status', handleApplicationStatus);

    return () => {
      socket.off('notification', handleNewNotification);
      socket.off('application_status', handleApplicationStatus);
      socket.disconnect?.();
    };
  }, [auth.user?._id, fetchNotifications, toast]);

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead: markNotificationAsRead,
    markAllAsRead: markAllNotificationsAsRead
  };
};