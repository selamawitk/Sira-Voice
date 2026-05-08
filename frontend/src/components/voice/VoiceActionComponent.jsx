import React, { useContext } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useVoice } from '../../hooks/useVoice.js';
import { AuthContext } from '../../context/AuthContextInstance.jsx';
import { ToastContext } from '../ui/ToastProvider.jsx';

const VoiceActionComponent = ({
  action = 'voice-action',
  buttonText = 'Voice Action',
  placeholder = 'Speak now...',
  onSuccess,
  onError,
  className = '',
  disabled = false,
  autoStart = false,
  jobId = null // For apply-job action
}) => {
  const auth = useContext(AuthContext);
  const toast = useContext(ToastContext);

  const {
    isListening,
    transcript,
    isProcessing,
    result,
    error,
    startListening,
    stopListening
  } = useVoice();

  const handleVoiceAction = async () => {
    if (isListening) {
      stopListening();
      return;
    }

    await startListening((voiceResult) => {
      if (voiceResult?.error) {
        toast?.show?.(voiceResult.error, 'error');
        onError?.(voiceResult.error);
        return;
      }

      // Handle different action types
      if (action === 'apply-job' && voiceResult.actionTaken === 'JOB_APPLICATION_CREATED') {
        toast?.show?.('Application submitted successfully!', 'success');
        onSuccess?.(voiceResult);
      } else if (action === 'post-job' && voiceResult.actionTaken === 'JOB_CREATED') {
        toast?.show?.('Job posted successfully!', 'success');
        onSuccess?.(voiceResult);
      } else if (action === 'voice-action') {
        // Generic voice action
        toast?.show?.('Voice command processed!', 'success');
        onSuccess?.(voiceResult);
      } else {
        toast?.show?.('Voice processed successfully', 'success');
        onSuccess?.(voiceResult);
      }
    }, { action, jobId });
  };

  React.useEffect(() => {
    if (autoStart && !disabled && auth?.user) {
      handleVoiceAction();
    }
  }, [autoStart, disabled, auth?.user]);

  const isDisabled = disabled || isProcessing || !auth?.user;

  return (
    <div className={`voice-action-component ${className}`}>
      {/* Voice Button */}
      <button
        onClick={handleVoiceAction}
        disabled={isDisabled}
        className={`
          relative flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-bold text-sm uppercase tracking-widest transition-all duration-300
          ${isListening
            ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25'
            : isProcessing
            ? 'bg-gray-500 text-white cursor-not-allowed'
            : isDisabled
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-[#2BB8B8] hover:bg-[#2BB8B8]/90 text-white shadow-lg hover:shadow-xl hover:scale-105'
          }
        `}
      >
        {isProcessing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isListening ? (
          <MicOff className="w-5 h-5" />
        ) : (
          <Mic className="w-5 h-5" />
        )}

        <span>
          {isProcessing
            ? 'Processing...'
            : isListening
            ? 'Stop Recording'
            : buttonText
          }
        </span>

        {/* Pulse animation for listening state */}
        {isListening && (
          <div className="absolute inset-0 rounded-2xl border-2 border-white/30 animate-ping" />
        )}
      </button>

      {/* Transcript Display */}
      {(transcript || isListening) && (
        <div className="mt-4 p-4 bg-white/[0.03] border border-white/10 rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-[#2BB8B8]'}`} />
            <span className="text-xs font-black uppercase tracking-widest text-gray-500">
              {isListening ? 'Listening...' : 'Transcript'}
            </span>
          </div>
          <p className="text-white text-sm leading-relaxed">
            {transcript || placeholder}
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
          <p className="text-red-400 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Result Summary */}
      {result && !isProcessing && (
        <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
          <p className="text-green-400 text-sm font-medium">
            ✓ {result.message || 'Action completed successfully'}
          </p>
          {result.data && (
            <div className="mt-2 text-xs text-green-300">
              {action === 'apply-job' && 'Application submitted'}
              {action === 'post-job' && `Job: ${result.data?.title || 'Created'}`}
              {action === 'voice-action' && 'Voice command executed'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VoiceActionComponent;