export const validateEthioPhone = (phone) => {
  // Matches +2519... or 09...
  const regex = /^(?:\+251|0)[97]\d{8}$/;
  return regex.test(phone);
};