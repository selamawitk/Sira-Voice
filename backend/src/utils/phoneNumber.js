export const formatEthioPhone = (phone) => {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '251' + cleaned.substring(1);
  } else if (cleaned.startsWith('9') || cleaned.startsWith('7')) {
    cleaned = '251' + cleaned;
  }
  return `+${cleaned}`;
};

export const isValidEthioPhone = (phone) => {
  const regex = /^\+251[79]\d{8}$/;
  return regex.test(phone);
};