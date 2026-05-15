import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
});

export { genAI, model };

const safeParse = (text) => {
  try {
    if (!text) return null;

    const cleaned = text.replace(/```json|```/g, '').trim();

    return JSON.parse(cleaned);
  } catch {
    return null;
  }
};

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

    return parsed;
  } catch {
    return null;
  }
};

export const extractProfileFromText = async (text) => {
  try {
    const prompt = `
Extract user profile from this text:
"${text}"

Return ONLY JSON:

{
  "name": "full name or null",
  "phone": "phone or null",
  "email": "email or null",
  "skills": ["skill1"],
  "bio": "short bio",
  "location": "location or null"
}
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
  } catch {
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