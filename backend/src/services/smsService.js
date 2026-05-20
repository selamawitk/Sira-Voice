import AfricasTalking from 'africastalking';
import dotenv from 'dotenv';

dotenv.config();

const username = process.env.AFRICAS_TALKING_USERNAME || 'sandbox';
const apiKey = process.env.AFRICAS_TALKING_API_KEY || process.env.AFRICASTALKING_API_KEY;

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
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.message);
  }
}

export const sendSms = async ({ to, message, from = 'SiraVoice' }) => {
  try {
    if (!smsClient) {
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
    return response;
  } catch (error) {
    throw error;
  }
};