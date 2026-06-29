import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-preview-04-17',
});

export { genAI, model };

const STRICT_SCHEMAS = {
  workerProfile: {
    skill: '',
    experienceYears: 0,
    location: '',
    availability: 'not specified',
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
    quantity: 1,
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
    console.error('SAFE PARSE ERROR:', err.message);
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

const getLangInstruction = (language) => {
  if (language === 'am') return 'Respond in Amharic (አማርኛ).';
  if (language === 'or') return 'Respond in Afaan Oromo.';
  return 'Respond in English.';
};

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
    console.error('TRANSLATION ERROR:', err);
    return { translatedText: text, sourceLanguage };
  }
};

export const processTextToData = async (transcript = '', language = 'am') => {
  try {
    if (!transcript?.trim()) return null;

    const langInstruction = getLangInstruction(language);

    const prompt = `You are Sira AI for Ethiopian job marketplace.
Input language detected: ${language}
${langInstruction}

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
  "quantity": 1,
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
    console.error('PROCESS TEXT ERROR:', err);
    return null;
  }
};

export const extractWorkerProfileFromText = async (text = '', language = 'am') => {
  try {
    const prompt = `Extract worker profile from this text.
Language: ${language}

Return ONLY valid JSON:
{
  "skill": "",
  "experienceYears": 0,
  "location": "",
  "availability": "immediate|within_week|within_month|not_available",
  "language": "${language}"
}

NO markdown. NO extra text. ONLY JSON.

Input: "${text}"`;

    const result = await model.generateContent(prompt);
    const raw = (await result.response).text();
    const parsed = safeParse(raw);
    const validated = validateAgainstSchema(parsed, STRICT_SCHEMAS.workerProfile);

    return validated || { skill: '', experienceYears: 0, location: '', availability: 'not specified', language };
  } catch (err) {
    console.error('WORKER PROFILE EXTRACTION ERROR:', err);
    return { skill: '', experienceYears: 0, location: '', availability: 'not specified', language };
  }
};

export const extractJobFromText = async (text = '', language = 'am') => {
  try {
    const langInstruction = getLangInstruction(language);

    const prompt = `Extract job posting details from this employer's request.
Language: ${language}
${langInstruction}

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
    console.error('JOB EXTRACTION ERROR:', err);
    return {
      jobTitle: '', quantity: 1, location: '',
      urgency: 'flexible', salary: 0,
      paymentType: 'daily', description: '',
    };
  }
};

export const extractProfileFromText = async (text = '') => {
  return extractWorkerProfileFromText(text, 'am');
};

export const analyzeJobForScam = async (description = '') => {
  try {
    const prompt = `Analyze this job posting for scam/fraud indicators.

Job Description: "${description}"

Analyze for:
- Requests for upfront payment
- Unusually high salary for the work
- Vague job description
- Requests for personal financial information
- Telegram/WhatsApp contact only
- Pressure to act quickly

Return ONLY valid JSON:
{
  "isSafe": true,
  "score": 0,
  "reason": "",
  "flags": []
}

- isSafe: false if suspicious
- score: 0-100 (0 = safe, 100 = definitely scam)
- reason: short explanation
- flags: array of specific concerns found

NO markdown. NO extra text. ONLY JSON.`;

    const result = await model.generateContent(prompt);
    const raw = (await result.response).text();
    const parsed = safeParse(raw);

    if (parsed && typeof parsed.isSafe === 'boolean') {
      return parsed;
    }

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
    console.error('SCAM ANALYSIS ERROR:', err);
    return { isSafe: true, score: 0, reason: 'Analysis failed safely', flags: [] };
  }
};

export const processRatingFromVoice = async (text = '', language = 'am') => {
  try {
    const langInstruction = getLangInstruction(language);

    const prompt = `Extract rating information from this voice input.
Language: ${language}
${langInstruction}

Extract:
- Who is being rated (name)
- The rating score (1-5)
- The comment/feedback

Return ONLY valid JSON:
{
  "targetName": "",
  "rating": 0,
  "comment": "",
  "jobContext": ""
}

NO markdown. NO extra text. ONLY JSON.

Input: "${text}"`;

    const result = await model.generateContent(prompt);
    const raw = (await result.response).text();
    return safeParse(raw) || { targetName: '', rating: 0, comment: '', jobContext: '' };
  } catch (err) {
    console.error('RATING EXTRACTION ERROR:', err);
    return { targetName: '', rating: 0, comment: '', jobContext: '' };
  }
};

export const generateSuggestions = async (role = 'worker', profile = {}, job = null) => {
  try {
    let prompt;

    if (role === 'worker') {
      const skills = profile.skills?.join(', ') || 'none';
      const bio = profile.bio || 'none';
      const experience = profile.experienceYears || 0;

      prompt = `You are Sira AI career advisor for Ethiopian workers.
Worker Profile:
- Skills: ${skills}
- Bio: ${bio}
- Experience: ${experience} years

Suggest 2-3 specific, actionable improvements for this worker to get more jobs.
Consider: missing skills, profile completeness, language preferences, location.

Return ONLY valid JSON array:
[
  {"type": "skill|profile|language|location", "message": "..."}
]

NO markdown. NO extra text. ONLY JSON.`;
    } else {
      const jobTitle = job?.title || 'none';
      const jobSalary = job?.salary || 0;
      const jobCategory = job?.category || 'none';

      prompt = `You are Sira AI advisor for Ethiopian employers.
Job Posting:
- Title: ${jobTitle}
- Category: ${jobCategory}
- Salary: ${jobSalary} ETB

Suggest 2-3 specific, actionable improvements to attract more workers.
Consider: salary range, job description clarity, location, payment type.

Return ONLY valid JSON array:
[
  {"type": "salary|description|location|timing", "message": "..."}
]

NO markdown. NO extra text. ONLY JSON.`;
    }

    const result = await model.generateContent(prompt);
    const raw = (await result.response).text();
    const parsed = safeParse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch (err) {
    console.error('SUGGESTIONS GENERATION ERROR:', err);
    return [];
  }
};

export const enhanceJobSearchWithRanking = async (transcript = '', jobs = [], language = 'am') => {
  try {
    if (!jobs.length) return [];

    const langInstruction = getLangInstruction(language);

    const jobsBrief = jobs.map((j, i) => ({
      index: i,
      title: j.title,
      category: j.category,
      salary: j.salary,
      location: j.location?.address || '',
      description: (j.description || '').slice(0, 100),
    }));

    const prompt = `You are Sira AI job matcher for Ethiopian marketplace.
User Query: "${transcript}"
Language: ${language}
${langInstruction}

Available Jobs: ${JSON.stringify(jobsBrief)}

Rank these jobs by relevance to the user query.
For each job provide:
- matchScore (0-100)
- reasons why it matches (array of short strings like "Skill matched", "Nearby", "Good salary", etc.)

Return ONLY valid JSON array:
[
  {
    "index": 0,
    "matchScore": 85,
    "reasons": ["Skill matched", "Nearby"]
  }
]

NO markdown. NO extra text. ONLY JSON.`;

    const result = await model.generateContent(prompt);
    const raw = (await result.response).text();
    const parsed = safeParse(raw);

    if (Array.isArray(parsed)) return parsed;
    return jobs.map((_, i) => ({ index: i, matchScore: 50, reasons: ['Available job'] }));
  } catch (err) {
    console.error('JOB RANKING ERROR:', err);
    return jobs.map((_, i) => ({ index: i, matchScore: 50, reasons: ['Available job'] }));
  }
};
