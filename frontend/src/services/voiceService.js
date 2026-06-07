import api from './api.js';

export const transcribeVoice = async (text, lang = 'en') => {
  const response = await api.post('/voice/transcribe', {
    text,
    lang,
  });

  return response.data;
};

export const voiceHire = async (
  jobId,
  text,
  lang = 'en'
) => {
  const response = await api.post(
    `/voice/hire/${jobId}`,
    {
      text,
      lang,
    }
  );

  return response.data;
};

export const searchVoiceTranscript = async (
  transcript,
  lang = 'en'
) => {
  const response = await api.post(
    '/ai/voice-search',
    {
      transcript,
      lang,
    }
  );

  return response.data;
};

export const processVoiceCV = async (
  text,
  lang = 'en'
) => {
  const response = await api.post(
    '/ai/process-cv',
    {
      text,
      lang,
    }
  );

  return response.data;
};