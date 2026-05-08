import AfricasTalking from 'africastalking';
import dotenv from 'dotenv';

dotenv.config();

// This checks BOTH naming versions from your .env to be 100% sure
const username = process.env.AFRICAS_TALKING_USERNAME || 'sandbox';
const apiKey = process.env.AFRICAS_TALKING_API_KEY || process.env.AFRICASTALKING_API_KEY;

if (!apiKey) {
  console.error('❌ AFRICAS_TALKING_API_KEY is missing in .env');
}

// We wrap the initialization so it doesn't crash the server if the key is blank
let smsClient = null;

try {
  if (apiKey) {
    const at = AfricasTalking({
      username,
      apiKey
    });
    smsClient = at.SMS;
  }
} catch (err) {
  console.error('❌ Failed to initialize Africa Talking SDK:', err.message);
}

export const sendSms = async ({ to, message, from = 'SiraVoice' }) => {
  try {
    if (!smsClient) {
      console.log('⚠️ SMS skipped: SDK not initialized (check API Key)');
      return { success: false, message: 'SMS gateway not configured' };
    }

    if (!to || (Array.isArray(to) && to.length === 0)) {
      throw new Error('Destination phone number is required.');
    }

    const recipients = Array.isArray(to) ? to : [to];
    const formattedRecipients = recipients.map(num => 
      num.startsWith('0') ? `+251${num.substring(1)}` : num
    );

    const options = {
      to: formattedRecipients,
      message,
      enqueue: true 
    };

    const response = await smsClient.send(options);
    console.log('✅ SMS Sent:', response);
    return response;
  } catch (error) {
    console.error('❌ SMS Service Error:', error.message);
    throw error;
  }
};