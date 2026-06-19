import fs from 'fs';

import {
  processTextToData,
  genAI
} from './aiService.js';

/* =========================
   🎤 TRANSCRIBE AUDIO
========================= */
export const transcribeAudio = async (filePath) => {
  try {
    if (!filePath) {
      return {
        text: '',
        language: 'unknown'
      };
    }

    const audioBase64 = fs
      .readFileSync(filePath)
      .toString('base64');

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
    });

    const prompt = `
You are a professional multilingual transcription engine.

Rules:
- Transcribe speech exactly
- Detect language automatically
- Support English, Amharic, Afaan Oromo
- Return ONLY valid JSON

{
  "transcript": "",
  "language": ""
}
`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: audioBase64,
          mimeType: 'audio/webm',
        },
      },
    ]);

    const raw = (await result.response).text();

    const cleaned = raw
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    return {
      text: parsed.transcript || '',
      language: parsed.language || 'unknown',
    };
  } catch (err) {
    console.error(
      '❌ TRANSCRIPTION ERROR:',
      err
    );

    return {
      text: '',
      language: 'unknown',
    };
  } finally {
    try {
      if (
        filePath &&
        fs.existsSync(filePath)
      ) {
        fs.unlinkSync(filePath);
      }
    } catch {}
  }
};

/* =========================
   🧠 FULL VOICE → AI PIPELINE
========================= */
export const processVoiceToData = async (
  filePath
) => {
  try {
    if (!filePath) {
      return fallbackVoice();
    }

    const transcription =
      await transcribeAudio(filePath);

    const transcript =
      transcription.text || '';

    const detectedLanguage =
      transcription.language || 'unknown';

    if (!transcript.trim()) {
      return fallbackVoice();
    }

    const ai =
      await processTextToData(transcript);

    return {
      transcript,
      detectedLanguage,
      ...ai,
    };
  } catch (err) {
    console.error(
      '❌ VOICE SERVICE ERROR:',
      err
    );

    return fallbackVoice();
  }
};

/* =========================
   🎧 SIMPLE TEXT WRAPPER
========================= */
export const transcribeAudioSimple =
  async (filePath) => {
    const res =
      await transcribeAudio(filePath);

    return {
      text: res.text || '',
      language:
        res.language || 'unknown',
    };
  };

/* =========================
   🧯 SAFE FALLBACK
========================= */
const fallbackVoice = () => ({
  transcript: '',
  intent: '',
  category: '',
  location: '',
  salary: 0,
  paymentType: 'daily',
  skills: [],
  summary: '',
  detectedLanguage: 'unknown',
});