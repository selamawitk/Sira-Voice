import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
});

export { genAI, model };

/* =========================
   🧼 SAFE JSON PARSER
========================= */
const safeParse = (text) => {
  try {
    if (!text) return null;

    const cleaned = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    return JSON.parse(cleaned);
  } catch (err) {
    console.error('❌ SAFE PARSE ERROR:', err);
    return null;
  }
};

/* =========================
   🧠 TEXT → INTENT ENGINE
   (USED BY VOICE + TEXT PIPELINE)
========================= */
export const processTextToData = async (transcript = '') => {
  try {
    if (!transcript?.trim()) {
      return null;
    }

    const prompt = `
You are Sira AI assistant.

Analyze the user input and extract structured intent.

Supported intents:
- search
- post
- profile
- hire
- apply

Return ONLY valid JSON:

{
  "intent": "",
  "category": "",
  "location": "",
  "salary": 0,
  "paymentType": "daily",
  "skills": [],
  "summary": "",
  "detectedLanguage": "auto"
}

User input:
"${transcript}"
`;

    const result = await model.generateContent(prompt);
    const raw = (await result.response).text();

    const parsed = safeParse(raw);

    return parsed || null;
  } catch (err) {
    console.error('❌ PROCESS TEXT ERROR:', err);
    return null;
  }
};

/* =========================
   👤 PROFILE EXTRACTION ENGINE
========================= */
export const extractProfileFromText = async (text = '') => {
  try {
    const prompt = `
Extract structured user profile from this text.

Return ONLY valid JSON:

{
  "name": null,
  "phone": null,
  "email": null,
  "skills": [],
  "bio": "",
  "location": ""
}

Input:
"${text}"
`;

    const result = await model.generateContent(prompt);
    const raw = (await result.response).text();

    const parsed = safeParse(raw);

    return (
      parsed || {
        name: 'User',
        phone: null,
        email: null,
        skills: [],
        bio: text,
        location: '',
      }
    );
  } catch (err) {
    console.error('❌ PROFILE EXTRACTION ERROR:', err);

    return {
      name: 'User',
      phone: null,
      email: null,
      skills: [],
      bio: text,
      location: '',
    };
  }
};

/* =========================
   ⚠️ JOB SAFETY ANALYZER
========================= */
export const analyzeJobForScam = async (description = '') => {
  try {
    const riskyKeywords = [
      'pay before',
      'deposit',
      'send money',
      'processing fee',
      'advance payment',
      'registration fee',
      'telegram payment',
    ];

    const lower = description.toLowerCase();

    const found = riskyKeywords.filter((k) =>
      lower.includes(k)
    );

    return {
      isSafe: found.length === 0,
      score: found.length ? 80 : 10,
      reason: found.length
        ? 'Suspicious payment or scam pattern detected'
        : 'Looks safe',
      flags: found,
    };
  } catch (err) {
    console.error('❌ SCAM ANALYSIS ERROR:', err);

    return {
      isSafe: true,
      score: 0,
      reason: 'Analysis failed safely',
      flags: [],
    };
  }
};