import fs from 'fs';

import { transcribeWithGroq, isGroqAvailable } from './groqSpeechService.js';
import {
  processTextToData,
  extractWorkerProfileFromText,
  extractJobFromText,
  translateText,
  genAI,
} from './aiService.js';

export const transcribeAudio = async (filePath) => {
  let result = null;

  if (filePath && isGroqAvailable()) {
    result = await transcribeWithGroq(filePath);
  } else {
    console.log('⚠️ Groq not available, using Gemini fallback');
  }

  if (!result || !result.text) {
    result = await transcribeWithGemini(filePath);
  }

  if (!result) {
    result = { text: '', language: 'unknown', duration: 0 };
  }

  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {}

  return result;
};

const transcribeWithGemini = async (filePath) => {
  try {
    if (!filePath) return { text: '', language: 'unknown', duration: 0 };

    const audioBase64 = fs.readFileSync(filePath).toString('base64');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-04-17' });

    const prompt = `You are a multilingual transcription engine.

Rules:
- Transcribe speech exactly as heard
- Detect language automatically (English, Amharic, Afaan Oromo)
- Return ONLY valid JSON — no markdown, no extra text

{
  "transcript": "",
  "language": "en|am|or"
}`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: audioBase64, mimeType: 'audio/webm' } },
    ]);

    const raw = (await result.response).text();
    const cleaned = raw.replace(/```json?/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      text: parsed.transcript || '',
      language: parsed.language || 'unknown',
      duration: 0,
    };
  } catch (err) {
    console.error('❌ GEMINI TRANSCRIPTION ERROR:', err);
    return { text: '', language: 'unknown', duration: 0 };
  }
};

export const processVoiceToData = async (filePath) => {
  try {
    if (!filePath) return fallbackVoice();

    const transcription = await transcribeAudio(filePath);
    const transcript = transcription.text || '';
    const detectedLanguage = transcription.language || 'unknown';

    if (!transcript.trim()) return fallbackVoice();

    let textForExtraction = transcript;
    let sourceLanguage = detectedLanguage;

    if (detectedLanguage === 'am' || detectedLanguage === 'or') {
      const translation = await translateText(transcript, detectedLanguage);
      textForExtraction = translation?.translatedText || transcript;
      sourceLanguage = translation?.sourceLanguage || detectedLanguage;
    }

    const ai = await processTextToData(textForExtraction, sourceLanguage);

    return {
      transcript,
      translatedText: textForExtraction,
      detectedLanguage: sourceLanguage,
      ...ai,
    };
  } catch (err) {
    console.error('❌ VOICE SERVICE ERROR:', err);
    return fallbackVoice();
  }
};

export const processWorkerVoiceToCV = async (filePath) => {
  try {
    if (!filePath) return fallbackCV();

    const transcription = await transcribeAudio(filePath);
    const transcript = transcription.text || '';
    const detectedLanguage = transcription.language || 'unknown';

    if (!transcript.trim()) return fallbackCV();

    let textForExtraction = transcript;
    let sourceLanguage = detectedLanguage;

    if (detectedLanguage === 'am' || detectedLanguage === 'or') {
      const translation = await translateText(transcript, detectedLanguage);
      textForExtraction = translation?.translatedText || transcript;
      sourceLanguage = translation?.sourceLanguage || detectedLanguage;
    }

    const profile = await extractWorkerProfileFromText(textForExtraction, sourceLanguage);

    return {
      transcript,
      translatedText: textForExtraction,
      detectedLanguage: sourceLanguage,
      profile,
    };
  } catch (err) {
    console.error('❌ VOICE→CV ERROR:', err);
    return fallbackCV();
  }
};

export const processEmployerVoiceToJob = async (filePath) => {
  try {
    if (!filePath) return fallbackJob();

    const transcription = await transcribeAudio(filePath);
    const transcript = transcription.text || '';
    const detectedLanguage = transcription.language || 'unknown';

    if (!transcript.trim()) return fallbackJob();

    const job = await extractJobFromText(transcript, detectedLanguage);

    return {
      transcript,
      translatedText: transcript,
      detectedLanguage,
      job,
    };
  } catch (err) {
    console.error('❌ VOICE→JOB ERROR:', err);
    return fallbackJob();
  }
};

export const transcribeAudioSimple = async (filePath) => {
  const res = await transcribeAudio(filePath);
  return { text: res.text || '', language: res.language || 'unknown' };
};

const fallbackVoice = () => ({
  transcript: '',
  translatedText: '',
  intent: '',
  category: '',
  location: '',
  salary: 0,
  paymentType: 'daily',
  skills: [],
  summary: '',
  detectedLanguage: 'unknown',
});

const fallbackCV = () => ({
  transcript: '',
  translatedText: '',
  detectedLanguage: 'unknown',
  profile: { skill: '', experienceYears: 0, location: '', language: '' },
});

const fallbackJob = () => ({
  transcript: '',
  translatedText: '',
  detectedLanguage: 'unknown',
  job: {
    jobTitle: '', quantity: 1, location: '',
    urgency: 'flexible', salary: 0,
    paymentType: 'daily', description: '',
  },
});
