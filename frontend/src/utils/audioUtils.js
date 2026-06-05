export const normalizeVoiceText = (text = '') => {
  return text
    .trim()
    .replace(/\s+/g, ' ');
};

export const isSpeechRecognitionSupported = () => {
  return !!(
    window.SpeechRecognition ||
    window.webkitSpeechRecognition
  );
};