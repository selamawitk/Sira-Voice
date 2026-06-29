import React, { useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; 
import api from '../../services/api.js';
import { ToastContext } from '../../components/ui/ToastContextInstance.jsx';
import { LanguageContext } from '../../context/LanguageContextInstance.jsx';
import { Loader2, ShieldCheck, Info, Mic, MicOff, Sparkles, MapPin, Star, Pencil, CheckCircle2, X } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const RecenterMap = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 13);
  }, [center, map]);
  return null;
};

const PostJob = () => {
  const toast = useContext(ToastContext);
  const lang = useContext(LanguageContext);
  const navigate = useNavigate(); 
  
  const t = lang?.copy || {}; 
  const activeLang = lang?.lang || 'en'; 

  const [activeTab, setActiveTab] = useState('form'); 

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [address, setAddress] = useState('');
  const [locationName, setLocationName] = useState('');
  const [salary, setSalary] = useState('');
  const [description, setDescription] = useState('');
  const [paymentType, setPaymentType] = useState('daily');
  const [useEscrow, setUseEscrow] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [isCheckingSecurity, setIsCheckingSecurity] = useState(false);

  const [applicants, setApplicants] = useState([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);

  const [mapCenter, setMapCenter] = useState([8.9806, 38.7578]);

  const [voiceState, setVoiceState] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [editedTranscript, setEditedTranscript] = useState('');
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [voiceJobData, setVoiceJobData] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const allFieldsFilled = title && salary && address && category;

  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await uploadAudio(blob);
      };

      recorder.start();
      setVoiceState('recording');
    } catch (err) {
      toast?.show?.('Microphone access denied', 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setVoiceState('transcribing');
    }
  };

  const uploadAudio = async (blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');
      const res = await api.post('/voice/job-preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setTranscript(res.data.transcript || '');
      setEditedTranscript(res.data.transcript || '');
      setVoiceJobData(res.data.job || null);
      setVoiceState('done');
    } catch (err) {
      toast?.show?.(err.response?.data?.message || 'Voice processing failed', 'error');
      setVoiceState('idle');
    }
  };

  const handleProceed = async () => {
    const textToProcess = editedTranscript.trim();
    let jobData = voiceJobData;

    if (textToProcess !== transcript && textToProcess) {
      try {
        const res = await api.post('/voice/job-preview', { transcript: textToProcess, lang: 'en' });
        jobData = res.data.job || null;
        setVoiceJobData(jobData);
      } catch (err) {
        // fall through with existing jobData
      }
    }

    if (jobData) {
      if (jobData.jobTitle) setTitle(jobData.jobTitle);
      if (jobData.category) setCategory(jobData.category);
      if (jobData.location) setAddress(jobData.location);
      if (jobData.salary && Number(jobData.salary) > 0) setSalary(String(jobData.salary));
      if (jobData.description) setDescription(jobData.description);
      if (jobData.paymentType) setPaymentType(jobData.paymentType);
    }

    toast?.show?.(
      activeLang === 'am' ? 'የስራ ፎርሙ ተሞልቷል!' : 
      activeLang === 'or' ? 'Unkaan hojii guutameera!' : 
      'Job form populated from voice!', 
      'success'
    );
  };

  const cancelVoice = () => {
    setVoiceState('idle');
    setTranscript('');
    setEditedTranscript('');
    setIsEditingTranscript(false);
    setVoiceJobData(null);
  };

  useEffect(() => {
    if (activeTab === 'applicants') {
      fetchAndRankApplicants();
    }
  }, [activeTab, category]);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
  };

  const fetchAndRankApplicants = async () => {
    setLoadingApplicants(true);
    try {
      const response = await api.get('/users/workers', {
        params: {
          lat: mapCenter[0],
          lng: mapCenter[1],
          maxDistance: 50,
          category: category || undefined,
        }
      });
      const workersData = response.data?.data || [];

      const processed = workersData.map((worker) => {
        const workerLat = worker.location?.coordinates?.[1] || 8.9806;
        const workerLng = worker.location?.coordinates?.[0] || 38.7578;
        const distance = calculateDistance(mapCenter[0], mapCenter[1], workerLat, workerLng);

        const hasSkillMatch = category 
          ? (worker.workerProfile?.skills || []).some(skill => skill.toLowerCase().includes(category.toLowerCase()))
          : false;

        let matchScore = 0;
        if (hasSkillMatch) matchScore += 50;
        matchScore += Math.max(0, 50 - distance); 

        return {
          ...worker,
          distance,
          matchScore,
          hasSkillMatch
        };
      });

      processed.sort((a, b) => b.matchScore - a.matchScore);
      setApplicants(processed);
    } catch (err) {
      console.error("Error loading candidate mapping profiles:", err);
    } finally {
      setLoadingApplicants(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!title || !salary) {
      toast?.show?.(
        activeLang === 'am' ? 'ርዕስ እና ደመወዝ ያስፈልጋሉ::' : activeLang === 'or' ? 'Mata duree fi Kafaltiin dirqama.' : 'Title and Salary are required.', 
        'info'
      );
      return;
    }

    setIsCheckingSecurity(true);
    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1800));

      const payload = {
        title,
        category: category || title,
        description,
        salary: Number(salary || 0),
        paymentType,
        escrowEnabled: useEscrow,
        location: {
          address: address || 'Addis Ababa',
          locationName: locationName || address || 'Addis Ababa',
          type: 'Point',
          coordinates: [mapCenter[1], mapCenter[0]],
        },
      };
      
      await api.post('/jobs', payload);
      toast?.show?.(
        activeLang === 'am' ? 'ስራዎ በቀጥታ ተለቋል! ተዛማጅ ሰራተኞችን በመፈለግ ላይ...' : activeLang === 'or' ? 'Hojiin keessan gadhiifameera! Hojjettoota barbaadaa jira...' : 'Your job is live! Finding matches...', 
        'success'
      );
      navigate('/employer-dashboard');
    } catch (err) {
      console.error(err);
      toast?.show?.(err.response?.data?.message || 'Failed to post job. Please check connection.', 'error');
    } finally {
      setIsCheckingSecurity(false);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pt-0 pb-8 relative">
      
      {isCheckingSecurity && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="p-8 bg-white/3 border border-white/10 rounded-4xl max-w-md w-full text-center space-y-5 shadow-2xl relative overflow-hidden">
            <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-emerald-500/10 blur-2xl rounded-full" />
            <div className="relative inline-flex items-center justify-center">
              <Loader2 className="w-14 h-14 text-[#2BB8B8] animate-spin" />
              <ShieldCheck className="w-6 h-6 text-emerald-400 absolute animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-white font-semibold text-xl tracking-tight">
                Sira is checking post security...
              </h3>
              <p className="text-white/40 text-xs normal-case max-w-xs mx-auto">
                Scanning job distributions, categories, and wages to prevent deceptive malicious activity and secure peer transparency.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex gap-2 border-b border-white/10 pb-px">
        <button 
          onClick={() => setActiveTab('form')}
          className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'form' ? 'text-[#2BB8B8] border-[#2BB8B8]' : 'text-white/40 border-transparent hover:text-white/70'}`}
        >
          {activeLang === 'am' ? 'የስራ ቅፅ' : 'Job Form'}
        </button>
        <button 
          onClick={() => setActiveTab('applicants')}
          className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'applicants' ? 'text-[#2BB8B8] border-[#2BB8B8]' : 'text-white/40 border-transparent hover:text-white/70'}`}
        >
          {activeLang === 'am' ? 'የሰራተኞች ካርታ እና ግምገማ' : 'Discover Workers Map'}
        </button>
      </div>

      {activeTab === 'form' ? (
        <>
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-4xl text-white italic tracking-tighter leading-none font-semibold pl-0">
                {activeLang === 'am' ? 'ስራ ይለጥፉ' : activeLang === 'or' ? 'Hojii Baasi' : (t.jobPostTitle || 'Post a Job')}
              </h1>
              <p className="text-white/40 mt-2 text-sm font-medium max-w-md pl-0 normal-case">
                {activeLang === 'am' 
                  ? 'ፍላጎትዎን ያብራሩ። ቀሪውን ስራ የሲራ AI ይወጣዋል።' 
                  : activeLang === 'or' 
                  ? 'Waan isiniif barbaachisu ibsa. Sira AI hafe isiniif xumura.' 
                  : (t.jobPostSubtitle || 'Describe your needs. Sira AI handles the rest.')}
              </p>
            </div>
          </div>

          <div className="mb-8 border transition-all duration-300 rounded-4xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden backdrop-blur-xl bg-white/5 border-white/10">
            <div className="absolute -left-20 -top-20 w-48 h-48 bg-[#2BB8B8] opacity-[0.02] blur-3xl pointer-events-none" />
            <div className="absolute -right-20 -bottom-20 w-48 h-48 bg-[#2BB8B8] opacity-[0.02] blur-3xl pointer-events-none" />

            {voiceState === 'idle' && (
              <>
                <div className="relative flex items-center justify-center mb-4">
                  <button
                    type="button"
                    onClick={startRecording}
                    className="w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 transform active:scale-95 shadow-xl relative z-10 bg-gradient-to-br from-[#2BB8B8] to-emerald-500 text-slate-950 hover:scale-105 shadow-[#2BB8B8]/20"
                  >
                    <Mic className="w-10 h-10" />
                  </button>
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <span className="text-[10px] bg-white/10 border border-white/10 px-2.5 py-0.5 rounded-full text-white/70 tracking-wider font-bold uppercase">
                    {activeLang === 'am' ? 'የሲራ ድምፅ ረዳት' : activeLang === 'or' ? 'Gargaara Sagalee Sira' : 'Sira Voice AI Agent'}
                  </span>
                  <h3 className="text-white font-semibold text-lg mt-2 normal-case">
                    {activeLang === 'am' ? 'ስራዎን ለመለጠፍ ይናገሩ' : activeLang === 'or' ? 'Hojii keessan galchuuf dubbadhaa' : 'Speak to post a job'}
                  </h3>
                  <p className="text-white/40 text-xs normal-case">
                    {activeLang === 'am' ? 'አማርኛ • Afan Oromo • English' : 'Works in Amharic • Afaan Oromoo • English'}
                  </p>
                </div>
                <p className="mt-4 text-[11px] text-white/30 max-w-md mx-auto leading-relaxed">
                  {activeLang === 'am' 
                    ? 'ለምርጥ ውጤት እንደዚህ ይበሉ፡ "የቧንቧ ሰራተኛ እፈልጋለሁ፣ በቦሌ፣ በቀን 800 ብር" — የስራ ርዕስ፣ ቦታ፣ ደሞዝ እና የክፍያ አይነት ይጥቀሱ' 
                    : activeLang === 'or' 
                    ? 'Ittaatti jedhaa: "Hojjetaa boombii nan barbaada, Finfinnee Booleetti, guyyaa 800 birr" — mata duree hojii, iddoo, kafaltii fi gosa kafaltii ibsi' 
                    : 'For best results say: "I need a plumber in Bole, 800 birr per day" — include job title, location, salary, and payment type'}
                </p>
              </>
            )}

            {voiceState === 'recording' && (
              <>
                <div className="relative flex items-center justify-center mb-4">
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 transform active:scale-95 shadow-xl relative z-10 bg-gradient-to-br from-red-500 to-rose-600 text-white animate-pulse shadow-red-500/20"
                  >
                    <MicOff className="w-10 h-10" />
                  </button>
                </div>
                <h3 className="text-white font-semibold text-lg normal-case">
                  {activeLang === 'am' ? 'በመቅረጽ ላይ... ለማቆም ይጫኑ' : activeLang === 'or' ? 'Galmee jira... dhaabuuf cuqaasi' : 'Recording... tap to stop'}
                </h3>
              </>
            )}

            {voiceState === 'transcribing' && (
              <>
                <Loader2 className="w-12 h-12 animate-spin text-[#2BB8B8] mb-4" />
                <h3 className="text-white font-semibold text-lg normal-case">
                  {activeLang === 'am' ? 'በማሰራት ላይ...' : activeLang === 'or' ? 'Hiikuu jira...' : 'Processing voice...'}
                </h3>
              </>
            )}

            {voiceState === 'done' && (
              <>
                <div className="relative flex items-center justify-center mb-4">
                  <div className="w-24 h-24 rounded-full flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                  </div>
                </div>

                <div className="max-w-lg w-full mx-auto space-y-3">
                  <div className="flex items-center justify-between gap-2 bg-white/5 border border-white/10 rounded-2xl p-3">
                    {isEditingTranscript ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          value={editedTranscript}
                          onChange={(e) => setEditedTranscript(e.target.value)}
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs outline-none focus:border-[#2BB8B8]/50"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => { setIsEditingTranscript(false); setEditedTranscript(transcript); }}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70 transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-xs text-white/70 text-left leading-relaxed truncate flex-1">
                          {editedTranscript || transcript}
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsEditingTranscript(true)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-[#2BB8B8] transition-all shrink-0"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={cancelVoice}
                      className="flex-1 px-4 py-2.5 rounded-2xl bg-white/5 text-white/70 font-medium hover:bg-white/10 transition-all text-xs"
                    >
                      {activeLang === 'am' ? 'ሰርዝ' : activeLang === 'or' ? 'Haqi' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      onClick={handleProceed}
                      className="flex-1 px-4 py-2.5 rounded-2xl bg-[#2BB8B8] text-slate-950 font-semibold hover:scale-[1.01] active:scale-95 transition-all text-xs"
                    >
                      {activeLang === 'am' ? 'ቀጥል' : activeLang === 'or' ? 'Itti Fufi' : 'Proceed'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {voiceState === 'idle' && !allFieldsFilled && (
            <div className="mb-4 text-[10px] text-white/30 text-center">
              {activeLang === 'am' ? 'ሁሉም መረጃዎች እስኪሞሉ ድረስ "አሁን ስራውን ልጥፍ" አይሰራም' : activeLang === 'or' ? 'Hanga odeeffannoo hunda guutametti "HOJII AMMA BAASI" hin hojjetu' : 'Post Job Now will remain disabled until all fields are filled'}
            </div>
          )}

          <form onSubmit={submit} className="bg-white/3 border border-white/10 rounded-4xl p-6 space-y-5 backdrop-blur-md relative overflow-hidden text-left">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 ml-1 font-medium">{t.fieldTitle || 'Title'}</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 text-white outline-none focus:border-[#2BB8B8]/50 focus:bg-white/10 transition-all text-sm font-medium"
                  placeholder={activeLang === 'am' ? 'ምሳሌ፡ ባለሙያ ቧንቧ ሰራተኛ' : activeLang === 'or' ? 'fkf. Hojjetaa Boombii' : 'e.g. Professional Plumber'}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 ml-1 font-medium">{t.fieldCategory || 'Category'}</label>
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 text-white outline-none focus:border-[#2BB8B8]/50 focus:bg-white/10 transition-all text-sm font-medium"
                  placeholder={activeLang === 'am' ? 'ምሳሌ፡ ጥገና' : activeLang === 'or' ? 'fkf. Suphaa' : 'e.g. Maintenance'}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 ml-1 font-medium">{t.fieldLocation || 'Address'}</label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 text-white outline-none focus:border-[#2BB8B8]/50 focus:bg-white/10 transition-all text-sm font-medium"
                  placeholder={activeLang === 'am' ? 'አዲስ አበባ፣ ቦሌ አካባቢ' : activeLang === 'or' ? 'Finfinnee, Naannoo Boolee' : 'Addis Ababa, Bole Area'}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 ml-1 font-medium">
                  {activeLang === 'am' ? 'የቦታ ስም' : activeLang === 'or' ? 'Maqaa Iddoo' : 'Place Name'}
                </label>
                <input
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 text-white outline-none focus:border-[#2BB8B8]/50 focus:bg-white/10 transition-all text-sm font-medium"
                  placeholder={activeLang === 'am' ? 'ምሳሌ፡ ቦሌ ሩብ' : activeLang === 'or' ? 'fkf. Boolee' : 'e.g. Bole, Addis Ababa'}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 ml-1 font-medium">
                  {activeLang === 'am' ? 'ደመወዝ (ብር)' : activeLang === 'or' ? 'Kafaltii (ETB)' : (t.fieldSalary || 'Salary (ETB)')}
                </label>
                <input
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 text-[#2BB8B8] font-bold outline-none focus:border-[#2BB8B8] focus:bg-[#2BB8B8]/5 transition-all text-sm"
                  placeholder="0.00"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-end">
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 ml-1 font-medium">
                  {activeLang === 'am' ? 'የክፍያ ድግግሞሽ' : activeLang === 'or' ? 'Irራdeddeffama Kafaltii' : (t.paymentFrequency || 'Payment Frequency')}
                </label>
                <div className="relative">
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 text-white outline-none focus:border-[#2BB8B8]/50 transition-all appearance-none cursor-pointer text-sm font-medium"
                  >
                    <option value="daily" className="bg-slate-900">
                      {activeLang === 'am' ? 'ዕለታዊ ክፍያ' : activeLang === 'or' ? 'Kafaltii Guyyaa' : 'Daily Rate'}
                    </option>
                    <option value="hourly" className="bg-slate-900">
                      {activeLang === 'am' ? 'የሰዓት ክፍያ' : activeLang === 'or' ? 'Kafaltii Sa’aatii' : 'Hourly Rate'}
                    </option>
                    <option value="fixed" className="bg-slate-900">
                      {activeLang === 'am' ? 'ቋሚ ውል' : activeLang === 'or' ? 'Waliigaltee Dhaabbataa' : 'Fixed Contract'}
                    </option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 text-xs">▼</div>
                </div>
              </div>
              
              <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between group/escrow">
                <div className="flex items-center gap-2">
                  <ShieldCheck className={`w-4 h-4 transition-colors ${useEscrow ? 'text-[#2BB8B8]' : 'text-white/20'}`} />
                  <span className="text-white text-xs font-medium">
                    {activeLang === 'am' ? 'በባለአደራ (Escrow) ይጠበቅ' : activeLang === 'or' ? 'Eskrowiin Eegumi' : (t.escrowLabel || 'Secure with Escrow')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setUseEscrow(!useEscrow)}
                  className={`w-9 h-5 rounded-full relative transition-all duration-300 ${useEscrow ? 'bg-[#2BB8B8]' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-slate-950 transition-all ${useEscrow ? 'left-4' : 'left-1'}`} />
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-white/40 ml-1 font-medium">{t.fieldDescription || 'Description'}</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 text-white outline-none focus:border-[#2BB8B8]/50 focus:bg-white/10 transition-all resize-none text-sm font-medium"
                placeholder={
                  activeLang === 'am' 
                    ? 'ልዩ መስፈርቶችን ወይም የሚያስፈልጉ መሳሪያዎችን ያብራሩ...' 
                    : activeLang === 'or' 
                    ? 'Ulaagaalee addaa ykn meeshaalee barbaachisan ibsi...' 
                    : 'Describe any specific requirements or tools needed...'
                }
              />
            </div>

            <div className="pt-4 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-white/5">
              <div className="flex items-start gap-1.5 text-white/30 text-[10px] font-medium max-w-65 normal-case">
                <Info className="w-3 h-3 mt-0.5 shrink-0" />
                {activeLang === 'am' 
                  ? 'ሰራተኞች "ክፍያ የተረጋገጠ" ባጅ ላላቸው ስራዎች ቅድሚያ ይሰጣሉ::' 
                  : activeLang === 'or' 
                  ? 'Hojjettoonni hojiiwwan mallattoo "Maallaqni Mirkanaa’e" qabaniif dursa kennu.' 
                  : (t.escrowHint || 'Workers prioritize jobs with "Funds Secured" badges.')}
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => navigate('/employer-dashboard')}
                  className="flex-1 md:flex-none px-8 py-3 rounded-2xl bg-white/5 text-white font-medium hover:bg-white/10 transition-all text-xs"
                >
                  {t.cancel || 'Cancel'}
                </button>
                <button
                  disabled={loading || !allFieldsFilled}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-10 py-3 rounded-2xl bg-[#2BB8B8] text-slate-950 font-semibold hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 text-xs shadow-lg shadow-[#2BB8B8]/10"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : activeLang === 'am' ? (
                    'አሁን ስራውን ልጥፍ'
                  ) : activeLang === 'or' ? (
                    'HOJII AMMA BAASI'
                  ) : (
                    'POST JOB NOW'
                  )}
                </button>
              </div>
            </div>
          </form>
        </>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-4xl overflow-hidden border border-white/10 h-[450px] relative z-10 shadow-xl">
              <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <RecenterMap center={mapCenter} />
                
                <Marker position={mapCenter}>
                  <Popup>
                    <span className="font-bold text-slate-950">Your Specified Location</span>
                  </Popup>
                </Marker>

                {applicants.map((worker) => {
                  const lat = worker.location?.coordinates?.[1] || 8.9806;
                  const lng = worker.location?.coordinates?.[0] || 38.7578;
                  return (
                    <Marker key={worker._id || worker.id} position={[lat, lng]}>
                      <Popup>
                        <div className="p-1 text-slate-950">
                          <p className="font-bold flex items-center gap-1">
                            {worker.name}
                            {worker.verified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" />}
                          </p>
                          <p className="text-xs">Distance: {worker.distance?.toFixed(1)} km</p>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold text-base tracking-tight">Matched Talent Pool</h3>
              <span className="text-[10px] bg-[#2BB8B8]/10 text-[#2BB8B8] border border-[#2BB8B8]/20 px-2.5 py-0.5 rounded-full font-bold uppercase">
                Sorted by Proximity
              </span>
            </div>

            <div className="space-y-3 max-h-[390px] overflow-y-auto pr-1">
              {loadingApplicants ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-2">
                  <Loader2 className="w-8 h-8 text-[#2BB8B8] animate-spin" />
                  <p className="text-white/40 text-xs">Evaluating target location parameters...</p>
                </div>
              ) : applicants.length === 0 ? (
                <p className="text-white/30 text-xs py-8 text-center">No available candidates discovered within regional cluster metrics.</p>
              ) : (
                applicants.map((worker, index) => (
                  <div 
                    key={worker._id || worker.id}
                    className={`p-4 border transition-all rounded-2xl relative overflow-hidden bg-white/3 border-white/10 hover:bg-white/5`}
                  >
                    {(index === 0 || worker.matchScore > 65) && (
                      <div className="absolute top-0 right-0 bg-gradient-to-l from-[#2BB8B8] to-emerald-500 text-slate-950 font-black text-[9px] tracking-wider px-3 py-1 rounded-bl-xl uppercase flex items-center gap-1 shadow-md">
                        <Sparkles className="w-3 h-3 animate-spin" />
                        AI Recommended Match
                      </div>
                    )}

                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-white font-bold text-sm tracking-tight">{worker.name}</h4>
                        {worker.verified && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded-md font-semibold uppercase">
                            <ShieldCheck className="w-3 h-3" /> Verified
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-white/60">
                        <div className="flex items-center gap-1 text-amber-400 font-bold">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          {worker.rating ? worker.rating.toFixed(1) : '4.8'}
                        </div>
                        <div className="flex items-center gap-1 text-white/40">
                          <MapPin className="w-3.5 h-3.5" />
                          {worker.distance?.toFixed(1)} km away
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1 pt-1">
                        {worker.skills?.slice(0, 3).map((skill, i) => (
                          <span key={i} className="text-[10px] bg-white/5 border border-white/5 px-2 py-0.5 rounded-md text-white/70 font-medium">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostJob;