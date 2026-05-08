import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
});

/* =========================
   SAFE JSON PARSER
========================= */
const safeParse = (text) => {
  try {
    if (!text) return null;

    const cleaned = text
      .replace(/```json|```/g, '')
      .trim();

    return JSON.parse(cleaned);
  } catch (err) {
    console.error('❌ JSON parse error:', text);
    return null;
  }
};

/* =========================
   🧠 TEXT AI (FAST)
========================= */
export const processTextToData = async (transcript = '') => {
  try {
    const prompt = `
You are Sira AI.

Analyze this text:
"${transcript}"

Return ONLY valid JSON:

{
  "intent": "search | post | profile | hire",
  "category": "",
  "location": "",
  "skills": [],
  "summary": "",
  "detectedLanguage": ""
}
`;

    const result = await model.generateContent(prompt);
    const raw = (await result.response).text();

    const parsed = safeParse(raw);

    return parsed || fallbackText(transcript);
  } catch (err) {
    console.error('❌ TEXT AI ERROR:', err);
    return fallbackText(transcript);
  }
};

/* =========================
   🎤 VOICE AI (STABLE VERSION)
========================= */
export const processVoiceToData = async (filePath) => {
  try {
    if (!filePath) return fallbackVoice();

    const audioBase64 = fs.readFileSync(filePath).toString('base64');

    const prompt = `
You are Sira Voice AI.

1. Transcribe speech EXACTLY
2. Detect intent: search | post | profile | hire
3. Extract category, location, skills

Return ONLY JSON:

{
  "transcript": "",
  "intent": "",
  "category": "",
  "location": "",
  "skills": [],
  "summary": "",
  "detectedLanguage": ""
}
`;

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
    const parsed = safeParse(raw);

    if (!parsed) return fallbackVoice();

    return parsed;
  } catch (err) {
    console.error('❌ VOICE AI ERROR:', err);
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
   👤 PROFILE EXTRACTION
========================= */
export const extractProfileFromText = async (text) => {
  const res = await processTextToData(text);

  return {
    phone: null,
    email: null,
    name: res.summary?.split(' ')[0] || 'User',
    skills: res.skills || [],
    bio: res.summary || text,
    location: res.location || '',
  };
};

/* =========================
   ⚠️ JOB SCAM CHECK (FAST LOCAL)
========================= */
export const analyzeJobForScam = async (description = '') => {
  const risky = [
    'pay before',
    'deposit',
    'send money',
    'processing fee',
    'advance payment',
  ];

  const found = risky.filter((k) =>
    description.toLowerCase().includes(k)
  );

  return {
    isSafe: found.length === 0,
    score: found.length ? 80 : 10,
    reason: found.length
      ? 'Suspicious payment request detected'
      : 'Looks safe',
  };
};

/* =========================
   🧯 FALLBACKS
========================= */
const fallbackText = (t) => ({
  intent: 'search',
  category: '',
  location: '',
  skills: [],
  summary: t,
  detectedLanguage: 'unknown',
});

const fallbackVoice = () => ({
  transcript: '',
  intent: 'search',
  category: '',
  location: '',
  skills: [],
  summary: '',
  detectedLanguage: 'unknown',
});