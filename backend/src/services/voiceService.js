import fs from 'fs';
import { processTextToData } from './aiService.js';

/* =========================
   🎤 VOICE → TEXT + AI PIPELINE (PRODUCTION SAFE)
========================= */
export const processVoiceToData = async (filePath) => {
  try {
    if (!filePath) return fallbackVoice();

    const audioBase64 = fs.readFileSync(filePath).toString('base64');

    const model = globalThis.genAI?.getGenerativeModel?.({
      model: 'gemini-1.5-flash',
    });

    let transcript = '';

    const prompt = `
You are a transcription engine.

Step 1: Transcribe speech EXACTLY
Return ONLY JSON:

{
  "transcript": "",
  "language": "auto"
}
`;

    // =========================
    // 🎯 TRY GEMINI AUDIO FIRST
    // =========================
    if (model) {
      try {
        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: audioBase64,
              mimeType: 'audio/webm;codecs=opus',
            },
          },
        ]);

        const raw = (await result.response).text();

        const cleaned = raw
          .replace(/```json|```/g, '')
          .trim();

        const parsed = JSON.parse(cleaned);

        transcript = parsed?.transcript || '';
      } catch (err) {
        console.warn('⚠️ Gemini transcription failed, using fallback');
      }
    }

    // =========================
    // 🧯 FALLBACK GUARD
    // =========================
    if (!transcript || transcript.trim() === '') {
      return fallbackVoice();
    }

    // =========================
    // 🧠 AI PROCESSING STEP
    // =========================
    const ai = await processTextToData(transcript);

    return {
      transcript,
      ...ai,
    };
  } catch (err) {
    console.error('❌ VOICE SERVICE ERROR:', err);
    return fallbackVoice();
  } finally {
    try {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {}
  }
};

/* =========================
   🎧 SIMPLE WRAPPER
========================= */
export const transcribeAudio = async (filePath) => {
  const res = await processVoiceToData(filePath);
  return { text: res.transcript || '' };
};

/* =========================
   🧯 FALLBACK (NEVER FAILS SYSTEM)
========================= */
const fallbackVoice = () => ({
  transcript: '',
  intent: 'search',
  category: '',
  location: '',
  skills: [],
  summary: '',
  detectedLanguage: 'unknown',
});