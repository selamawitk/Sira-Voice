import api from './api.js';

export const transcribeVoice = async (audioBlob) => {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');

  try {
    // Backend: POST /api/ai/voice-action
    const response = await api.post('/ai/voice-action', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch {
    throw new Error("Voice transcription failed.");
  }
};