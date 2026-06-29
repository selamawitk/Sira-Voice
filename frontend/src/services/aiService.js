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

export const checkJobSafety = async (jobId) => {
  try {
    const response = await api.get(`/ai/verify-safety/${jobId}`);
    return response.data;
  } catch {
    return { analysis: { isSafe: true, score: 0, reason: 'Safety check unavailable', flags: [] } };
  }
};