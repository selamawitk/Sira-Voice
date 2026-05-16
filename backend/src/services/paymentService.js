import axios from 'axios';

export const initializePayment = async ({
  userDetails,
  amount,
  tx_ref,
  purpose = 'job_payment',
  workerId = null,
  jobId = null,
  contractId = null,
}) => {
  if (!process.env.CHAPA_SECRET_KEY) {
    throw new Error('CHAPA_SECRET_KEY missing');
  }

  if (!process.env.BACKEND_URL) {
    throw new Error('BACKEND_URL missing');
  }

  if (!process.env.FRONTEND_URL) {
    throw new Error('FRONTEND_URL missing');
  }

  const config = {
    headers: {
      Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
  };

  const firstName = userDetails?.fullName?.split(' ')?.[0] || 'Sira';
  const lastName = userDetails?.fullName?.split(' ')?.slice(1)?.join(' ') || 'User';

  const body = {
    amount: amount.toString(),
    currency: 'ETB',
    email: userDetails?.email || `${userDetails?.phone || 'customer'}@sira.local`,
    first_name: firstName,
    last_name: lastName,
    tx_ref,
    callback_url: `${process.env.BACKEND_URL}/api/payments/webhook`,
    return_url: `${process.env.FRONTEND_URL}/contracts?payment=success`,
    'customization[title]': 'Sira-Voice Payment',
    'customization[description]': `Payment for ${purpose}`,
    meta: {
      purpose,
      workerId,
      jobId,
      contractId,
    },
  };

  const response = await axios.post(
    'https://api.chapa.co/v1/transaction/initialize',
    body,
    config
  );

  return response.data;
};