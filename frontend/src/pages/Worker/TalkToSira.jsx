import React, { useContext, useState, useEffect } from 'react';
import { useVoice } from '../../hooks/useVoice.js';
import api from '../../services/api.js';
import { LanguageContext } from '../../context/LanguageContextInstance.jsx';
import { ToastContext } from '../../components/ui/ToastContextInstance.jsx';
import { Send, Sparkles, CheckCircle2, Briefcase, MapPin, DollarSign } from 'lucide-react';

const TalkToSira = () => {
  const { isListening, transcript, isProcessing, startListening, stopListening } = useVoice();
  const [editable, setEditable] = useState('');
  const [localProcessing, setLocalProcessing] = useState(false);
  const lang = useContext(LanguageContext);
  const copy = lang?.copy;
  const currentLang = lang?.language || 'english'; 
  const toast = useContext(ToastContext);
  const [jobs, setJobs] = useState([]);

  // Sync state when new speech data arrives from user microphone context
  useEffect(() => {
    if (transcript) {
      setEditable(transcript);
    }
  }, [transcript]);

  // Multilingual Fallbacks Dictionary
  const fallbackCopy = {
    talkToSira: {
      english: 'Talk to Sira',
      amharic: 'ከሥራ ጋር ይነጋገሩ',
      oromigna: 'Siraa wajjin dubbadhu'
    },
    voiceAssistantSubtitle: {
      english: 'Speak in Amharic, Afaan Oromo, or English. You can edit what Sira heard before taking action.',
      amharic: 'በአማርኛ፣ በአፋን ኦሮሞ ወይም በእንግሊዝኛ ይናገሩ። ሥራ እርምጃ ከመውሰዱ በፊት የሰማውን ማስተካከል ይችላሉ።',
      oromigna: 'Afaan Oromoo, Amaariffa ykn Ingiliffaan dubbadhu. Sira\'n gocha dura waan dhaga\'e sirreessuu dandeessa.'
    },
    listening: {
      english: 'Listening… speak now',
      amharic: 'በማዳመጥ ላይ… አሁን ይናገሩ',
      oromigna: 'Dhaggeeffachaa jira… amma dubbadhu'
    },
    processingVoice: {
      english: 'Sira is thinking…',
      amharic: 'ሥራ በማሰብ ላይ ነው…',
      oromigna: 'Sira\'n yaadaa jira…'
    },
    tapToSpeak: {
      english: 'Tap to speak',
      amharic: 'ለመናገር ይንኩ',
      oromigna: 'Dubbachuuf tuqi'
    },
    autoStopHint: {
      english: 'Auto-stops after ~10 seconds.',
      amharic: 'ከ~10 ሰከንድ በኋላ በራሱ ይቆማል።',
      oromigna: 'Sekondii ~10 booda ofiin dhaabbata.'
    },
    transcribedTextLabel: {
      english: 'Transcribed text (editable)',
      amharic: 'የተቀዳ ጽሑፍ (ሊስተካከል የሚችል)',
      oromigna: 'Barreeffama waraabame (kan sirreeffamu)'
    },
    micPlaceholder: {
      english: 'Your speech will appear here…',
      amharic: 'የተናገሩት እዚህ ይወጣል…',
      oromigna: 'Wanti ati dubbattu asitti mul\'ata…'
    },
    suggestedJobsLabel: {
      english: 'Suggested jobs',
      amharic: 'የቀረቡ ሥራዎች',
      oromigna: 'Hojiiwwan siif dhiyaatan'
    },
    executeActionButton: {
      english: 'Process Command',
      amharic: 'ትዕዛዝ አከናውን',
      oromigna: 'Ajaja Raawwadhu'
    },
    applyNowButton: {
      english: 'Apply via Profile',
      amharic: 'በፕሮፋይል ያመልክቱ',
      oromigna: 'Iyyadhichaan iyyadhu'
    }
  };

  const getCopy = (key, defaultStr) => {
    return copy?.[key] ?? fallbackCopy[key]?.[currentLang] ?? fallbackCopy[key]?.['english'] ?? defaultStr;
  };

  // Process structured responses from engine hook configurations
  const handleVoiceIntentPayload = (result) => {
    if (result?.actionTaken === 'JOB_SEARCH_RESULTS') {
      setJobs(result?.data || []);
      toast?.show?.('AI found jobs for you!', 'success');
    } else if (result?.actionTaken === 'PROFILE_UPDATED') {
      toast?.show?.('Profile updated successfully!', 'success');
    } else if (result?.actionTaken === 'JOB_CREATED') {
      toast?.show?.('Job posted successfully!', 'success');
    } else if (result?.actionTaken === 'APPLICATION_SUBMITTED') {
      toast?.show?.('Application dispatched directly to employer!', 'success');
    } else {
      toast?.show?.('Voice query processed.', 'info');
    }
  };

  const start = async () => {
    setJobs([]);
    await startListening((result) => {
      if (result?.transcript) {
        setEditable(result.transcript);
      }
      handleVoiceIntentPayload(result);
    });
  };

  // Dispatches typed or heavily edited commands manual fallback routing fallback
  const handleManualSubmit = async () => {
    if (!editable.trim()) return;
    setLocalProcessing(true);
    try {
      const res = await api.post('/ai/process-intent', { 
        prompt: editable,
        lang: currentLang 
      });
      if (res.data?.success) {
        handleVoiceIntentPayload(res.data.result);
      }
    } catch (err) {
      console.error('Failed parsing statement text:', err);
      toast?.show?.('Could not process instructions.', 'error');
    } finally {
      setLocalProcessing(false);
    }
  };

  // Direct manual alternative to voice dispatch triggers
  const handleApplyToJob = async (jobId) => {
    try {
      const res = await api.post(`/jobs/${jobId}/apply`);
      if (res.data?.success) {
        toast?.show?.('Application submitted successfully!', 'success');
        // Filter out job instantly to keep dynamic clean layout view state representation
        setJobs(prev => prev.filter(j => j._id !== jobId));
      }
    } catch (err) {
      toast?.show?.(err.response?.data?.message || 'Application submission failed.', 'error');
    }
  };

  const showingLoader = isProcessing || localProcessing;

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white flex items-center gap-3">
          {getCopy('talkToSira', 'Talk to Sira')}
          <Sparkles className="w-6 h-6 text-[#2BB8B8] animate-pulse" />
        </h1>
        <p className="text-gray-400 mt-2">
          {getCopy('voiceAssistantSubtitle', 'Speak in Amharic, Afaan Oromo, or English. You can edit what Sira heard before taking action.')}
        </p>
      </div>

      <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-md relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#2BB8B8] opacity-[0.03] blur-[80px] pointer-events-none" />
        
        <div className="flex flex-col items-center gap-6">
          {/* Main Visual Big Mic Trigger Control Element Row */}
          <button
            onClick={isListening ? stopListening : start}
            disabled={localProcessing}
            className="relative w-40 h-40 rounded-full bg-[#1A2E35] border border-white/10 grid place-items-center transition-all active:scale-95 group focus:outline-none disabled:opacity-50"
            aria-label={isListening ? 'Stop recording' : 'Start recording'}
          >
            <span
              className={`absolute inset-0 rounded-full transition-all duration-300 ${
                isListening ? 'animate-ping bg-[#2BB8B8]/20' : 'bg-transparent group-hover:bg-white/5'
              }`}
            />
            <span
              className={`absolute inset-[-12px] rounded-full border transition-all duration-500 ${
                isListening ? 'border-[#2BB8B8]/60 shadow-[0_0_50px_rgba(43,184,184,0.28)]' : 'border-white/10 group-hover:border-white/20'
              }`}
            />
            <span className={`text-5xl transition-transform duration-300 ${isListening ? 'scale-110' : 'group-hover:scale-105'}`}>
              🎤
            </span>
          </button>

          <div className="text-center">
            <p className="text-white font-bold text-lg">
              {isListening 
                ? getCopy('listening', 'Listening… speak now') 
                : showingLoader 
                ? getCopy('processingVoice', 'Sira is thinking…') 
                : getCopy('tapToSpeak', 'Tap to speak')
              }
            </p>
            <p className="text-gray-500 text-sm mt-1">
              {getCopy('autoStopHint', 'Auto-stops after ~10 seconds.')}
            </p>
          </div>

          {/* Interactive Text Field & Confirmation Submission Area Controls */}
          <div className="w-full space-y-3">
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500">
              {getCopy('transcribedTextLabel', 'Transcribed text (editable)')}
            </label>
            <div className="relative">
              <textarea
                value={editable}
                onChange={(e) => setEditable(e.target.value)}
                rows={4}
                disabled={showingLoader}
                className="w-full bg-[#1A2E35]/60 border border-white/10 rounded-2xl p-4 pr-14 text-white outline-none focus:border-[#2BB8B8]/50 placeholder:text-gray-600 transition-all disabled:opacity-60 resize-none"
                placeholder={getCopy('micPlaceholder', 'Your speech will appear here…')}
              />
              {editable.trim() && !showingLoader && (
                <button
                  onClick={handleManualSubmit}
                  className="absolute bottom-4 right-4 bg-[#2BB8B8] hover:bg-[#239696] text-white p-2.5 rounded-xl transition-colors shadow-md"
                  title={getCopy('executeActionButton', 'Process Command')}
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Render List Dynamic Outputs */}
          {showingLoader && (
            <div className="w-full flex flex-col items-center justify-center py-12 border border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
              <div className="inline-block w-8 h-8 border-4 border-[#2BB8B8]/20 border-t-[#2BB8B8] rounded-full animate-spin mb-3" />
              <p className="text-white/40 text-sm font-medium">{getCopy('processingVoice', 'Sira is thinking…')}</p>
            </div>
          )}

          {jobs.length > 0 && !showingLoader ? (
            <div className="w-full mt-4 animate-fadeIn">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 mb-4 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#2BB8B8]" />
                {getCopy('suggestedJobsLabel', 'Suggested jobs')}
              </p>
              <div className="grid grid-cols-1 gap-4">
                {jobs.map((j) => (
                  <div 
                    key={j._id} 
                    className="bg-[#1A2E35]/40 border border-white/10 rounded-2xl p-5 hover:border-[#2BB8B8]/30 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 group"
                  >
                    <div className="space-y-1.5">
                      <p className="text-white font-bold text-lg group-hover:text-[#2BB8B8] transition-colors">{j.title}</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/50">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-gray-500" />
                          {j.location?.address ?? 'Addis Ababa'}
                        </span>
                        <span className="flex items-center gap-1 font-medium text-emerald-400">
                          <DollarSign className="w-3.5 h-3.5" />
                          {j.salary?.toLocaleString() ?? 0} ETB
                        </span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleApplyToJob(j._id)}
                      className="bg-white/5 hover:bg-[#2BB8B8] border border-white/10 hover:border-transparent text-white font-medium px-5 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm sm:self-center self-stretch"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {getCopy('applyNowButton', 'Apply via Profile')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default TalkToSira;