import asyncHandler from '../utils/asyncHandler.js';
import { subscribeUser, unsubscribeUser } from '../services/pushService.js';

export const subscribe = asyncHandler(async (req, res) => {
  const { subscription, userAgent } = req.body;
  if (!subscription || !subscription.endpoint) {
    res.status(400);
    throw new Error('Invalid push subscription');
  }
  await subscribeUser(req.user._id, subscription, userAgent);
  res.status(201).json({ success: true, message: 'Subscribed to push notifications' });
});

export const unsubscribe = asyncHandler(async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) {
    res.status(400);
    throw new Error('Endpoint is required');
  }
  await unsubscribeUser(req.user._id, endpoint);
  res.json({ success: true, message: 'Unsubscribed from push notifications' });
});

export const getVapidPublicKey = asyncHandler(async (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});
