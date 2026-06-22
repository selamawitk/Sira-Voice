import fs from 'fs';
import Groq from 'groq-sdk';

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Transcribe audio file using Groq Whisper Large-v3
 * with retry logic and language detection.
 *
 * @param {string} filePath - Path to audio file
 * @returns {Promise<{text: string, language: string, duration: number}>}
 */
export const transcribeWithGroq = async (filePath) => {
  if (!groq) {
    console.warn('⚠️ GROQ_API_KEY not set, skipping Groq transcription');
    return null;
  }

  if (!filePath || !fs.existsSync(filePath)) {
    console.error('❌ Audio file not found:', filePath);
    return null;
  }

  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const fileStream = fs.createReadStream(filePath);
      const ext = filePath.split('.').pop().toLowerCase();

      const mimeMap = {
        webm: 'audio/webm',
        wav: 'audio/wav',
        mp3: 'audio/mpeg',
        m4a: 'audio/mp4',
        ogg: 'audio/ogg',
        flac: 'audio/flac',
      };

      const transcription = await groq.audio.transcriptions.create({
        file: fileStream,
        model: 'whisper-large-v3-turbo',
        response_format: 'verbose_json',
        language: 'mul',
        temperature: 0,
      });

      const text = transcription?.text?.trim() || '';
      const detectedLanguage = transcription?.segments?.[0]?.language || 'am';

      // Normalize language code to our format
      const languageMap = {
        amharic: 'am',
        am: 'am',
        oromo: 'or',
        om: 'or',
        english: 'en',
        en: 'en',
      };

      const language = languageMap[detectedLanguage.toLowerCase()] || 'am';
      const duration = transcription?.segments?.reduce((sum, s) => sum + (s.end - s.start), 0) || 0;

      if (text) {
        console.log(`✅ Groq [attempt ${attempt}]: "${text.slice(0, 60)}..." (${language})`);
      }

      return { text, language, duration };

    } catch (err) {
      lastError = err;
      console.error(`❌ Groq attempt ${attempt}/${MAX_RETRIES}:`, err.message);

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * attempt;
        console.log(`⏳ Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  console.error('❌ Groq transcription failed after', MAX_RETRIES, 'attempts');
  return null;
};

/**
 * Check if Groq is configured
 */
export const isGroqAvailable = () => !!groq;
