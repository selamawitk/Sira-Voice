import api from './api.js';

export const initializePayment = async (data) => {
  const response = await api.post('/payments/initialize', data);
  return response.data;
};

export const getUserTransactions = async () => {
  const response = await api.get('/payments/transactions');
  return response.data;
};

export const upgradeSubscription = async (planType) => {
  const response = await api.post('/subscriptions/upgrade', { planType });
  return response.data;
};

export const getSubscriptionStatus = async () => {
  const response = await api.get('/subscriptions/status');
  return response.data;
};