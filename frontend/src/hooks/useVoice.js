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
    // Default action to 'voice-action' to support conversational matching endpoints
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

      // Unified cross-browser container parameters layout matching webm standards
      let optionsMime = { mimeType: 'audio/webm;codecs=opus' };
      if (!MediaRecorder.isTypeSupported(optionsMime.mimeType)) {
        optionsMime = { mimeType: 'audio/ogg;codecs=opus' };
        if (!MediaRecorder.isTypeSupported(optionsMime.mimeType)) {
          optionsMime = { mimeType: 'audio/mp4' }; // Fallback container validation logic
        }
      }

      const mediaRecorder = new MediaRecorder(stream, optionsMime);

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
            type: mediaRecorder.mimeType,
          });

          const formData = new FormData();
          formData.append('audio', audioBlob, 'voice.webm');
          formData.append('lang', currentLang);

          if (jobId) formData.append('jobId', jobId);
          if (action) formData.append('action', action);

          // Route payloads between multi-factor auth files or parsing intents
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

          // Normalize the structure so the hook seamlessly maps to your TalkToSira template layout
          const normalizedResult = {
            transcript: data.transcript || '',
            actionTaken: data.result?.actionTaken || data.actionTaken || null,
            data: data.result?.data || data.data || []
          };

          setResult(data);
          setTranscript(normalizedResult.transcript);

          if ((action === 'register' || action === 'login') && data.token) {
            authContext?.login?.(data);

            toastContext?.show?.(
              action === 'register'
                ? 'Voice registration successful!'
                : 'Voice login successful!',
              'success'
            );
          }

          // Fires structural updates directly back into your UI state
          if (onComplete && typeof onComplete === 'function') {
            onComplete(normalizedResult);
          }
        } catch (err) {
          console.error('Error handling recorded audio payload chunks:', err);
          setError('AI processing failed. Try again.');

          toastContext?.show?.(
            'AI processing failed. Try again.',
            'error'
          );
        } finally {
          setIsProcessing(false);
          // Kill active mic lines immediately on completion to clear mobile hardware bars
          stream.getTracks().forEach((t) => t.stop());
        }
      };

      mediaRecorder.start();
      setIsListening(true);

      // Auto-stop window configured for safety boundaries
      timeoutRef.current = setTimeout(() => {
        stopListening();
      }, 10000);
    } catch (err) {
      console.error('Failed to open microphone capture streams:', err);
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