import api from './api.js';

export const transcribeVoice = async (audioBlob) => {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');

  const response = await api.post('/voice/transcribe', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data;
};

export const voiceHire = async (jobId, audioBlob) => {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'hire-command.webm');

  const response = await api.post(`/voice/hire/${jobId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data;
};

export const searchVoiceTranscript = async (transcript) => {
  const response = await api.post('/ai/voice-search', { transcript });
  return response.data;
};

export const processVoiceCV = async (audioBlob) => {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'voice-cv.webm');

  const response = await api.post('/ai/process-cv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data;
};
