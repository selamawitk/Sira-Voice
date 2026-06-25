import { useState, useRef, useContext, useEffect } from 'react';
import { LanguageContext } from '../context/LanguageContextInstance.jsx';
import { AuthContext } from '../context/AuthContextInstance.jsx';
import { ToastContext } from '../components/ui/ToastContextInstance.jsx';
import api from '../services/api.js';

export const useVoice = (onCompleteCallback, externalLang) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');

  const languageContext = useContext(LanguageContext);
  const authContext = useContext(AuthContext);
  const toastContext = useContext(ToastContext);

  const currentLang = externalLang || languageContext?.lang || languageContext?.language || 'en';

  const langMap = {
    en: 'en-US',
    am: 'am-ET',
    or: 'om-ET',
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = langMap[currentLang] || 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = finalTranscriptRef.current;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += `${text} `;
        } else {
          interimTranscript += text;
        }
      }

      finalTranscriptRef.current = finalTranscript;
      setTranscript(`${finalTranscript} ${interimTranscript}`.trim());
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') return;
      setError(event.error);
      toastContext?.show?.(event.error || 'Speech recognition failed', 'error');
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [currentLang, toastContext]);

  const startListening = async (inlineOnComplete, options = {}) => {
    const { action = 'post-job-ai', jobId = null } = options;

    if (isListening) return;

    setError(null);
    setResult(null);
    setTranscript('');
    finalTranscriptRef.current = '';

    try {
      recognitionRef.current.lang = langMap[currentLang] || 'en-US';
      recognitionRef.current.start();

      recognitionRef.current.action = action;
      recognitionRef.current.jobId = jobId;
      recognitionRef.current.onComplete = inlineOnComplete || onCompleteCallback;
    } catch (err) {
      console.error(err);
      setError('Microphone access denied');
      toastContext?.show?.('Microphone access denied', 'error');
      setIsListening(false);
    }
  };

  const stopListening = async () => {
    if (!recognitionRef.current || !isListening) return;

    recognitionRef.current.stop();
    setIsListening(false);
    setIsProcessing(true);

    try {
      const action = recognitionRef.current.action || 'post-job-ai';
      const jobId = recognitionRef.current.jobId || null;
      const onComplete = recognitionRef.current.onComplete;

      let endpoint = '/ai/voice-action';
      if (action === 'register' || action === 'login') {
        endpoint = '/auth/voice-auth';
      } else if (action === 'post-job-ai' || action === 'profile') {
        endpoint = '/ai/voice-action';
      }

      const payload = {
        transcript: finalTranscriptRef.current.trim(),
        lang: currentLang,
        action,
      };

      if (jobId) {
        payload.jobId = jobId;
      }

      const request = api.post(endpoint, payload);
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), 40000)
      );

      const response = await Promise.race([request, timeout]);
      const data = response.data;

      const responsePayload = data.result?.data || data.data || data;

      const normalizedResult = {
        transcript: data.transcript || finalTranscriptRef.current.trim(),
        actionTaken: data.result?.actionTaken || data.actionTaken || null,
        data: responsePayload,
      };

      setResult(normalizedResult);

      if ((action === 'register' || action === 'login') && data.token) {
        authContext?.login?.(data);
        toastContext?.show?.(
          action === 'register' ? 'Voice registration successful!' : 'Voice login successful!',
          'success'
        );
      }

      if (onComplete && typeof onComplete === 'function') {
        onComplete(normalizedResult);
      }
    } catch (err) {
      console.error(err);
      setError('AI processing failed. Try again.');
      toastContext?.show?.('AI processing failed. Try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isListening,
    transcript,
    isProcessing,
    result,
    error,
    startListening,
    stopListening,
  };
};