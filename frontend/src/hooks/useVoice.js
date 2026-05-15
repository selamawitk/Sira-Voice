import { useState, useRef, useContext } from 'react';
import { LanguageContext } from '../context/LanguageContextInstance.jsx';
import { AuthContext } from '../context/AuthContextInstance.jsx';
import { ToastContext } from '../components/ui/ToastContextInstance.jsx';
import api from '../services/api.js';

export const useVoice = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timeoutRef = useRef(null);

  const languageContext = useContext(LanguageContext);
  const authContext = useContext(AuthContext);
  const toastContext = useContext(ToastContext);

  const currentLang =
    languageContext?.lang || languageContext?.language || 'en';

  const stopListening = () => {
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }

      const stream = mediaRecorderRef.current.stream;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsListening(false);
  };

  const startListening = async (onComplete, options = {}) => {
    const { action = 'voice-action', jobId = null } = options;

    if (isListening) return;

    setError(null);
    setResult(null);
    setTranscript('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstart = () => {
        setIsListening(true);
      };

      mediaRecorder.onstop = async () => {
        setIsProcessing(true);

        try {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: 'audio/webm',
          });

          const formData = new FormData();
          formData.append('audio', audioBlob, 'voice.webm');
          formData.append('lang', currentLang);

          if (jobId) formData.append('jobId', jobId);
          if (action) formData.append('action', action);

          // Choose endpoint based on action
          const endpoint = (action === 'register' || action === 'login') 
            ? '/auth/voice-auth' 
            : '/ai/voice-action';

          const request = api.post(endpoint, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });

          const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('TIMEOUT')), 40000)
          );

          const response = await Promise.race([request, timeout]);

          const data = response.data;

          setResult(data);
          setTranscript(data.transcript || '');

          if (
            (action === 'register' || action === 'login') &&
            data.token
          ) {
            authContext?.login?.(data);

            toastContext?.show?.(
              action === 'register'
                ? 'Voice registration successful!'
                : 'Voice login successful!',
              'success'
            );
          }

          onComplete?.(data);
} catch {
          setError('AI processing failed. Try again.');

          toastContext?.show?.(
            'AI processing failed. Try again.',
            'error'
          );
        } finally {
          setIsProcessing(false);

          stream.getTracks().forEach((t) => t.stop());
        }
      };

      mediaRecorder.start();
      setIsListening(true);

      timeoutRef.current = setTimeout(() => {
        stopListening();
      }, 12000);
    } catch {
      setError('Microphone access denied');

      toastContext?.show?.(
        'Microphone access denied',
        'error'
      );

      setIsListening(false);
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