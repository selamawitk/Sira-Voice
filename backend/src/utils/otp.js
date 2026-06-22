export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};
export const isOTPExpired = (createdAt, expiresInMinutes = 10) => {
  const now = new Date();
  const diff = (now - new Date(createdAt)) / (1000 * 60);
  return diff > expiresInMinutes;
}