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
  const langCtx = useContext(LanguageContext);
  const toast = useContext(ToastContext);

  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all');

  // Inline localized fallback dictionary mapper
  const getLabel = (key, enVal, amVal, orVal) => {
    if (langCtx?.copy?.[key]) return langCtx.copy[key];
    if (langCtx?.lang === 'am') return amVal;
    if (langCtx?.lang === 'or') return orVal;
    return enVal;
  };

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
        toast?.show?.(
          getLabel('failLoadNotifications', 'Failed to load notifications', 'ማሳወቂያዎችን መጫን አልተሳካም', `Beeksisoota fiduun hin danda'amne`), 
          'error'
        );
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, [user?._id, toast, langCtx?.lang]);

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
      toast?.show?.(
        getLabel('allMarkedReadToast', 'All notifications marked as read', 'ሁሉም ማሳወቂያዎች ተነበዋል ተብለዋል', 'Beeksisni hundi akka dubbifametti mallatteeffameera'), 
        'success'
      );
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const target = notifications.find(n => n._id === notificationId);
      if (target && !target.isRead) {
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
      
      await api.delete(`/notifications/${notificationId}`);
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      toast?.show?.(
        getLabel('notificationDeletedToast', 'Notification deleted', 'ማሳወቂያው ተሰርዟል', 'Beeksisni haqameera'), 
        'success'
      );
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const getFilterTabLabel = (type) => {
    switch (type) {
      case 'all': 
        return getLabel('filterAll', 'All', 'ሁሉም', 'Hunda');
      case 'unread': 
        return getLabel('filterUnread', 'Unread', 'ያልተነበቡ', 'Kan Haxaaffamne');
      case 'JOB_MATCH': 
        return getLabel('filterJobMatch', 'Job Match', 'የስራ ግጥሚያ', 'Waliigalte Hojii');
      case 'HIRE': 
        return getLabel('filterHire', 'Hire', 'ቅጥር', 'Qaxara');
      case 'PAYMENT': 
        return getLabel('filterPayment', 'Payment', 'ክፍያ', 'Kaffaltii');
      case 'RATING': 
        return getLabel('filterRating', 'Rating', 'ደረጃ', 'Sadarkaa');
      default: 
        return type.replace('_', ' ');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      {/* Header View */}
      <div className="mb-8">
        <h1 className="text-4xl font-semibold text-white mt-[-35px]">
          {getLabel('notificationsTitle', 'Notifications', 'ማሳወቂያዎች', 'Beeksisoota')}
        </h1>
        <p className="text-white/60 mt-2">
          {unreadCount > 0
            ? langCtx?.lang === 'am'
              ? `${unreadCount} ያልተነበቡ ማሳወቂያዎች አሉዎት`
              : langCtx?.lang === 'or'
              ? `Beeksisoota dubbifamne ${unreadCount} qabdu`
              : `You have ${unreadCount} unread notification(s)`
            : getLabel('noUnreadNotifications', 'All caught up!', 'ሁሉም ተይዟል!', 'Hundi dubbifameera!')}
        </p>
      </div>

      {/* Mark All Action Button Element */}
      {unreadCount > 0 && (
        <div className="mb-6">
          <button
            onClick={markAllAsRead}
            className="px-6 py-2 rounded-xl bg-[#2BB8B8]/20 border border-[#2BB8B8]/40 text-[#2BB8B8] font-medium text-sm hover:bg-[#2BB8B8]/30 transition-all"
          >
            {getLabel('markAllRead', 'Mark all as read', 'ሁሉንም ተነቧል በል', 'Hunda akka dubbifametti mallatteessi')}
          </button>
        </div>
      )}

      {/* Filter Tabs Navigation */}
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
            {getFilterTabLabel(type)}
          </button>
        ))}
      </div>

      {/* Notifications Container Box Area */}
      <GlassCard className="relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-[#2BB8B8] opacity-[0.03] blur-[80px] pointer-events-none" />

        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block w-8 h-8 border-4 border-[#2BB8B8]/20 border-t-[#2BB8B8] rounded-full animate-spin mb-4" />
            <p className="text-white/50 font-medium">
              {getLabel('loadingNotifications', 'Loading notifications...', 'ማሳወቂያዎች በመጫን ላይ...', 'Beeksisoonni fe\'amaa jiru...')}
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Bell className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/40 text-lg">
              {filter === 'all'
                ? getLabel('noNotificationsYet', 'No notifications yet', 'ምንም ማሳወቂያዎች የሉም', 'Beeksisni hin jiru')
                : filter === 'unread'
                ? getLabel('noUnreadNotificationsYet', 'No unread notifications', 'ምንም ያልተነበቡ ማሳወቂያዎች የሉም', 'Beeksisni hin dubbifamne hin jiru')
                : langCtx?.lang === 'am'
                ? `ምንም የ${getFilterTabLabel(filter)} ማሳወቂያዎች የሉም`
                : langCtx?.lang === 'or'
                ? `Beeksisni ${getFilterTabLabel(filter)} hin jiru`
                : `No ${getFilterTabLabel(filter)} notifications`}
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
                        {new Date(notification.createdAt).toLocaleDateString(langCtx?.lang === 'am' ? 'am-ET' : 'en-US')} {' '}
                        {getLabel('atWord', 'at', 'በ', 'sa\'aatii')} {' '}
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