import webpush from 'web-push';
import PushSubscription from '../models/PushSubscription.js';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:support@siravoice.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
);

export const sendPushNotification = async (userId, title, body, data = {}) => {
  try {
    const subscriptions = await PushSubscription.find({ userId });

    if (!subscriptions.length) return [];

    const results = [];
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
          },
          JSON.stringify({ title, body, ...data }),
        );
        results.push({ success: true, endpoint: sub.endpoint });
      } catch (error) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          await PushSubscription.deleteOne({ _id: sub._id });
        }
        results.push({ success: false, endpoint: sub.endpoint, error: error.message });
      }
    }
    return results;
  } catch (error) {
    console.error('Push notification error:', error);
    return [];
  }
};

export const subscribeUser = async (userId, subscription, userAgent) => {
  const existing = await PushSubscription.findOne({ endpoint: subscription.endpoint });
  if (existing) {
    existing.userId = userId;
    existing.keys = subscription.keys;
    existing.userAgent = userAgent || existing.userAgent;
    await existing.save();
    return existing;
  }
  return PushSubscription.create({
    userId,
    endpoint: subscription.endpoint,
    keys: subscription.keys,
    userAgent,
  });
};

export const unsubscribeUser = async (userId, endpoint) => {
  return PushSubscription.deleteOne({ userId, endpoint });
};
