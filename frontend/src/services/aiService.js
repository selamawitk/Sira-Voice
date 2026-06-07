import api from './api.js';

export const transcribeVoice = async (
  text,
  lang = 'en'
) => {
  try {
    const response = await api.post(
      '/ai/voice-action',
      {
        text,
        lang,
      }
    );

    return response.data;
  } catch {
    throw new Error('Voice transcription failed.');
  }
};