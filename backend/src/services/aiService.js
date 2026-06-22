import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-preview-04-17',
});

export { genAI, model };

/* =========================
   🧼 STRICT JSON PARSER
   No markdown. No prose.
   No hallucinated fields.
========================= */
const STRICT_SCHEMAS = {
  workerProfile: {
    skill: '',
    experienceYears: 0,
    location: '',
    language: '',
  },
  jobPost: {
    jobTitle: '',
    quantity: 0,
    location: '',
    urgency: '',
    salary: 0,
    paymentType: 'daily',
    description: '',
  },
  intent: {
    intent: '',
    category: '',
    location: '',
    salary: 0,
    paymentType: 'daily',
    skills: [],
    summary: '',
    language: '',
  },
  translation: {
    translatedText: '',
    sourceLanguage: '',
  },
};

const safeParse = (text) => {
  try {
    if (!text) return null;
    const cleaned = text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .replace(/^[^{]*/, '')
      .replace(/[^}]*$/, '')
      .trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('❌ SAFE PARSE ERROR:', err.message);
    return null;
  }
};

const validateAgainstSchema = (parsed, schema) => {
  if (!parsed || typeof parsed !== 'object') return null;
  const validated = { ...schema };
  for (const key of Object.keys(schema)) {
    if (key in parsed) {
      const expectedType = typeof schema[key];
      const actualType = typeof parsed[key];
      if (expectedType === actualType || Array.isArray(schema[key])) {
        validated[key] = parsed[key];
      }
    }
  }
  return validated;
};

/* =========================
   🌐 TRANSLATION ENGINE
   Amharic/Oromo → English
========================= */
export const translateText = async (text, sourceLanguage) => {
  if (!text?.trim()) return null;
  if (sourceLanguage === 'en') {
    return { translatedText: text, sourceLanguage: 'en' };
  }

  const langName = sourceLanguage === 'am' ? 'Amharic' : 'Afaan Oromo';

  try {
    const prompt = `Translate the following ${langName} text to English. Return ONLY valid JSON:

{
  "translatedText": "",
  "sourceLanguage": "${sourceLanguage}"
}

Input: "${text}"`;

    const result = await model.generateContent(prompt);
    const raw = (await result.response).text();
    const parsed = safeParse(raw);
    const validated = validateAgainstSchema(parsed, STRICT_SCHEMAS.translation);

    return validated?.translatedText
      ? { translatedText: validated.translatedText, sourceLanguage }
      : { translatedText: text, sourceLanguage };
  } catch (err) {
    console.error('❌ TRANSLATION ERROR:', err);
    return { translatedText: text, sourceLanguage };
  }
};

/* =========================
   🧠 TEXT → INTENT ENGINE
   Detects what user wants to do
========================= */
export const processTextToData = async (transcript = '', language = 'am') => {
  try {
    if (!transcript?.trim()) return null;

    const prompt = `You are Sira AI for Ethiopian job marketplace.
Input language detected: ${language}

Analyze the input and extract structured intent.

Supported intents:
- search (looking for jobs)
- post (want to post a job)
- profile (update profile/skills)
- hire (want to hire someone)
- apply (apply for a job)

Return ONLY valid JSON:
{
  "intent": "search|post|profile|hire|apply",
  "category": "",
  "location": "",
  "salary": 0,
  "paymentType": "daily|weekly|monthly|fixed",
  "skills": [],
  "summary": "",
  "language": "${language}"
}

NO markdown. NO extra text. ONLY JSON.

Input: "${transcript}"`;

    const result = await model.generateContent(prompt);
    const raw = (await result.response).text();
    const parsed = safeParse(raw);
    const validated = validateAgainstSchema(parsed, STRICT_SCHEMAS.intent);

    return validated;
  } catch (err) {
    console.error('❌ PROCESS TEXT ERROR:', err);
    return null;
  }
};

/* =========================
   👤 WORKER PROFILE EXTRACTION
   Voice/CV → Structured Profile
========================= */
export const extractWorkerProfileFromText = async (text = '', language = 'am') => {
  try {
    const prompt = `Extract worker profile from this text.
Language: ${language}

Return ONLY valid JSON:
{
  "skill": "",
  "experienceYears": 0,
  "location": "",
  "language": "${language}"
}

NO markdown. NO extra text. ONLY JSON.

Input: "${text}"`;

    const result = await model.generateContent(prompt);
    const raw = (await result.response).text();
    const parsed = safeParse(raw);
    const validated = validateAgainstSchema(parsed, STRICT_SCHEMAS.workerProfile);

    return validated || { skill: '', experienceYears: 0, location: '', language };
  } catch (err) {
    console.error('❌ WORKER PROFILE EXTRACTION ERROR:', err);
    return { skill: '', experienceYears: 0, location: '', language };
  }
};

/* =========================
   💼 EMPLOYER JOB EXTRACTION
   Voice → Structured Job Post
========================= */
export const extractJobFromText = async (text = '', language = 'am') => {
  try {
    const prompt = `Extract job posting details from this employer's request.
Language: ${language}

Return ONLY valid JSON:
{
  "jobTitle": "",
  "quantity": 1,
  "location": "",
  "urgency": "tomorrow|this week|flexible",
  "salary": 0,
  "paymentType": "daily|weekly|monthly|fixed",
  "description": ""
}

NO markdown. NO extra text. ONLY JSON.

Input: "${text}"`;

    const result = await model.generateContent(prompt);
    const raw = (await result.response).text();
    const parsed = safeParse(raw);
    const validated = validateAgainstSchema(parsed, STRICT_SCHEMAS.jobPost);

    return validated || {
      jobTitle: '', quantity: 1, location: '',
      urgency: 'flexible', salary: 0,
      paymentType: 'daily', description: '',
    };
  } catch (err) {
    console.error('❌ JOB EXTRACTION ERROR:', err);
    return {
      jobTitle: '', quantity: 1, location: '',
      urgency: 'flexible', salary: 0,
      paymentType: 'daily', description: '',
    };
  }
};

/* =========================
   👤 LEGACY PROFILE EXTRACTION
   (Kept for backward compat)
========================= */
export const extractProfileFromText = async (text = '') => {
  return extractWorkerProfileFromText(text, 'am');
};

/* =========================
   ⚠️ JOB SAFETY ANALYZER
========================= */
export const analyzeJobForScam = async (description = '') => {
  try {
    const riskyKeywords = [
      'pay before', 'deposit', 'send money',
      'processing fee', 'advance payment',
      'registration fee', 'telegram payment',
    ];

    const lower = description.toLowerCase();
    const found = riskyKeywords.filter((k) => lower.includes(k));

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
    return { isSafe: true, score: 0, reason: 'Analysis failed safely', flags: [] };
  }
};
