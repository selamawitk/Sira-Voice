import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Bell, Trash2, CheckCircle2, AlertCircle, Zap, Gift } from 'lucide-react';
import api from '../../services/api.js';
import { AuthContext } from '../../context/AuthContextInstance.jsx';
import { LanguageContext } from '../../context/LanguageContextInstance.jsx';
import { ToastContext } from '../../components/ui/ToastContextInstance.jsx';

const GlassCard = ({ children, className = '' }) => (
  <div className={`bg-white/[0.03] border border-white/10 rounded-3xl p-6 backdrop-blur-md ${className}`}>
    {children}
  </div>
);

const NotificationIcon = ({ type }) => {
  switch (type) {
    case 'JOB_MATCH':
      return <Zap className="w-5 h-5 text-yellow-400" />;
    case 'HIRE':
      return <Gift className="w-5 h-5 text-green-400" />;
    case 'PAYMENT':
      return <CheckCircle2 className="w-5 h-5 text-blue-400" />;
    case 'RATING':
      return <AlertCircle className="w-5 h-5 text-purple-400" />;
    default:
      return <Bell className="w-5 h-5 text-white/60" />;
  }
};

const Notifications = () => {
  const auth = useContext(AuthContext);
  const user = auth?.user;
  const lang = useContext(LanguageContext);
  const toast = useContext(ToastContext);

  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?._id) return;
      setLoading(true);
      try {
        const res = await api.get('/notifications');
        setNotifications(res.data?.data || []);
        setUnreadCount(res.data?.unreadCount || 0);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
        toast?.show?.('Failed to load notifications', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, [user?._id, toast]);

  const filtered = useMemo(() => {
    if (filter === 'all') return notifications;
    if (filter === 'unread') return notifications.filter(n => !n.isRead);
    return notifications.filter(n => n.type === filter);
  }, [notifications, filter]);

  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast?.show?.('All notifications marked as read', 'success');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      toast?.show?.('Notification deleted', 'success');
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-semibold text-white">
          {lang?.copy?.notificationsTitle || 'Notifications'}
        </h1>
        <p className="text-white/60 mt-2">
          {unreadCount > 0
            ? `You have ${unreadCount} unread ${lang?.copy?.notificationsLabel || 'notification(s)'}`
            : lang?.copy?.noUnreadNotifications || 'All caught up!'}
        </p>
      </div>

      {/* Action Bar */}
      {unreadCount > 0 && (
        <div className="mb-6">
          <button
            onClick={markAllAsRead}
            className="px-6 py-2 rounded-xl bg-[#2BB8B8]/20 border border-[#2BB8B8]/40 text-[#2BB8B8] font-medium text-sm hover:bg-[#2BB8B8]/30 transition-all"
          >
            Mark all as read
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 pb-4 border-b border-white/10">
        {['all', 'unread', 'JOB_MATCH', 'HIRE', 'PAYMENT', 'RATING'].map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filter === type
                ? 'bg-[#2BB8B8] text-slate-950'
                : 'bg-white/5 border border-white/10 text-white/70 hover:border-white/20'
            }`}
          >
            {type === 'all'
              ? 'All'
              : type === 'unread'
                ? 'Unread'
                : type.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <GlassCard className="relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-[#2BB8B8] opacity-[0.03] blur-[80px] pointer-events-none" />

        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block w-8 h-8 border-4 border-[#2BB8B8]/20 border-t-[#2BB8B8] rounded-full animate-spin mb-4" />
            <p className="text-white/50 font-medium">Loading notifications...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Bell className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/40 text-lg">
              {filter === 'all'
                ? 'No notifications yet'
                : filter === 'unread'
                  ? 'No unread notifications'
                  : `No ${filter} notifications`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(notification => (
              <div
                key={notification._id}
                onClick={() => !notification.isRead && markAsRead(notification._id)}
                className={`group p-4 rounded-2xl border transition-all cursor-pointer ${
                  notification.isRead
                    ? 'bg-white/[0.02] border-white/5 hover:border-white/10'
                    : 'bg-[#2BB8B8]/10 border-[#2BB8B8]/30 hover:border-[#2BB8B8]/50'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="mt-1 flex-shrink-0">
                      <NotificationIcon type={notification.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-semibold">
                          {notification.title}
                        </h3>
                        {!notification.isRead && (
                          <span className="w-2 h-2 bg-[#2BB8B8] rounded-full" />
                        )}
                      </div>
                      <p className="text-white/60 text-sm mt-1">
                        {notification.message}
                      </p>
                      <p className="text-white/30 text-xs mt-2">
                        {new Date(notification.createdAt).toLocaleDateString()} at{' '}
                        {new Date(notification.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      deleteNotification(notification._id);
                    }}
                    className="flex-shrink-0 p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/10 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default Notifications;
