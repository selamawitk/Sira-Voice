import api from './api.js';

export const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const requestPushPermission = async () => {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const url = import.meta.env.PROD ? '/sw.js' : '/dev-sw.js?dev-sw';
    const registration = await navigator.serviceWorker.register(url, {
      scope: '/',
      type: import.meta.env.PROD ? 'classic' : 'module',
    });
    return registration;
  } catch {
    return null;
  }
};

export const subscribeToPush = async (registration) => {
  try {
    const { data } = await api.get('/push/vapid-public-key');
    const { publicKey } = data;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await api.post('/push/subscribe', {
      subscription: subscription.toJSON(),
      userAgent: navigator.userAgent,
    });

    return true;
  } catch {
    return false;
  }
};

export const unsubscribeFromPush = async (registration) => {
  try {
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await api.post('/push/unsubscribe', {
        endpoint: subscription.endpoint,
      });
      await subscription.unsubscribe();
    }
    return true;
  } catch {
    return false;
  }
};

export const setupPushNotifications = async () => {
  const hasPermission = await requestPushPermission();
  if (!hasPermission) return false;

  const registration = await registerServiceWorker();
  if (!registration) return false;

  const existingSubscription = await registration.pushManager.getSubscription();
  if (existingSubscription) return true;

  return await subscribeToPush(registration);
};
