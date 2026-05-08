import axios from 'axios';

export const initializePayment = async (userDetails, amount, tx_ref) => {
  const config = {
    headers: {
      Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
      "Content-Type": "application/json"
    }
  };

  const body = {
    amount: amount.toString(),
    currency: "ETB",
    email: userDetails.email || "customer@sira.com",
    first_name: userDetails.fullName.split(' ')[0],
    last_name: userDetails.fullName.split(' ')[1] || "User",
    tx_ref: tx_ref,
    callback_url: `${process.env.BACKEND_URL}/api/payments/verify/${tx_ref}`,
    "customization[title]": "Sira-Voice Payment",
    "customization[description]": "Payment for Service Commission"
  };

  const response = await axios.post(
    'https://api.chapa.co/v1/transaction/initialize',
    body,
    config
  );

  return response.data; // Returns the checkout_url for the frontend
};