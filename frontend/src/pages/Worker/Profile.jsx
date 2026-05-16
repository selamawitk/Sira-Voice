import React, { useContext, useEffect, useState } from 'react';
import { MapPin, Award, ShieldCheck, Edit3, Save, X } from 'lucide-react';
import api from '../../services/api.js';
import { AuthContext } from '../../context/AuthContextInstance.jsx';
import toast from 'react-hot-toast';

const Profile = () => {
  const auth = useContext(AuthContext);
  const user = auth?.user;
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    bio: user?.workerProfile?.bio || '',
    skills: user?.workerProfile?.skills?.join(', ') || '',
    experienceYears: user?.workerProfile?.experienceYears ?? 0,
    preferredLanguage: user?.workerProfile?.preferredLanguage || 'amharic'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFormData({
      bio: user?.workerProfile?.bio || '',
      skills: user?.workerProfile?.skills?.join(', ') || '',
      experienceYears: user?.workerProfile?.experienceYears ?? 0,
      preferredLanguage: user?.workerProfile?.preferredLanguage || 'amharic'
    });
  }, [user]);

  const skills = user?.workerProfile?.skills ?? [];
  const rating = user?.workerProfile?.averageRating ?? user?.workerProfile?.rating ?? 0;

  const handleSave = async () => {
    setLoading(true);
    try {
      const skillsArray = formData.skills.split(',').map((s) => s.trim()).filter((s) => s !== '');
      await api.put('/users/profile', {
        workerProfile: {
          ...user.workerProfile,
          bio: formData.bio,
          skills: skillsArray,
          experienceYears: Number(formData.experienceYears) || 0,
          preferredLanguage: formData.preferredLanguage
        }
      });

      await auth.fetchMe();
      toast.success('Profile updated');
      setIsEditing(false);
    } catch (err) {
      toast.error('Update failed');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleAutoApply = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const currentPrefs = user?.workerProfile?.agentPreferences || {};
      const newStatus = !currentPrefs.autoApply;

      await api.put('/users/agent-preferences', {
        autoApply: newStatus
      });

      await auth.fetchMe();
      toast.success(newStatus ? 'Auto-apply ON 🤖' : 'Auto-apply OFF');
    } catch (err) {
      toast.error('Could not toggle Auto-Apply');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-in fade-in duration-500 pb-10">
      
      <div className="relative bg-white/[0.03] border border-white/10 rounded-[2rem] p-6 backdrop-blur-3xl overflow-hidden group">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#2BB8B8]/10 blur-[80px] rounded-full"></div>
        
        <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
          <div className="relative">
            <div className="w-24 h-24 rounded-[1.8rem] bg-gradient-to-tr from-[#2BB8B8] to-cyan-400 p-[2px] shadow-xl">
              <div className="w-full h-full rounded-[1.7rem] bg-[#1A2E35] flex items-center justify-center text-3xl font-black text-white">
                {(user?.fullName?.[0] ?? 'W').toUpperCase()}
              </div>
            </div>
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="absolute -bottom-1 -right-1 bg-[#2BB8B8] p-2 rounded-lg text-white hover:scale-110 transition-transform shadow-lg"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="text-center md:text-left flex-1">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <h1 className="text-3xl font-black text-white tracking-tight">{user?.fullName ?? 'Profile'}</h1>
              {user?.isVerified && <ShieldCheck className="w-5 h-5 text-[#2BB8B8]" />}
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-2">
              <span className="flex items-center gap-1.5 text-[10px] text-white/50 font-bold bg-white/5 px-3 py-1 rounded-full border border-white/5">
                <MapPin className="w-3 h-3 text-[#2BB8B8]" /> {user?.location?.address ?? 'Addis Ababa'}
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-white/50 font-bold bg-white/5 px-3 py-1 rounded-full border border-white/5">
                <Award className="w-3 h-3 text-[#2BB8B8]" /> {Number(rating).toFixed(1)} Rating
              </span>
            </div>
          </div>

          {isEditing && (
            <div className="flex gap-2">
              <button onClick={handleSave} className="bg-[#2BB8B8] text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2">
                <Save className="w-4 h-4" /> Save
              </button>
              <button onClick={() => setIsEditing(false)} className="bg-white/5 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2">
                <X className="w-4 h-4" /> Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        <div className="bg-white/[0.03] border border-white/10 rounded-[1.5rem] p-6">
          <h3 className="text-white font-bold text-sm mb-3">Bio</h3>
          {isEditing ? (
            <textarea 
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white text-xs outline-none min-h-[100px]"
            />
          ) : (
            <p className="text-gray-400 text-xs leading-relaxed">
              {user?.workerProfile?.bio || 'No bio provided.'}
            </p>
          )}
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-[1.5rem] p-6">
          <h3 className="text-white font-bold text-sm mb-3">Skills</h3>
          {isEditing ? (
            <input 
              type="text"
              value={formData.skills}
              onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
              className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white text-xs outline-none"
              placeholder="Comma-separated skills"
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {skills.length > 0 ? skills.map((skill) => (
                <span key={skill} className="bg-[#2BB8B8]/10 text-[#2BB8B8] text-[9px] font-black uppercase px-3 py-1 rounded-lg border border-[#2BB8B8]/20">
                  {skill}
                </span>
              )) : (
                <span className="text-white/40 text-xs">No skills added.</span>
              )}
            </div>
          )}
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-[1.5rem] p-6">
          <h3 className="text-white font-bold text-sm mb-3">Experience</h3>
          {isEditing ? (
            <input
              type="number"
              min="0"
              value={formData.experienceYears}
              onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
              className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white text-xs outline-none"
              placeholder="Years of experience"
            />
          ) : (
            <p className="text-gray-400 text-xs leading-relaxed">
              {user?.workerProfile?.experienceYears ?? 0} years experience
            </p>
          )}
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-[1.5rem] p-6">
          <h3 className="text-white font-bold text-sm mb-3">Preferred Language</h3>
          {isEditing ? (
            <select
              value={formData.preferredLanguage}
              onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value })}
              className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white text-xs outline-none"
            >
              <option value="amharic">Amharic</option>
              <option value="oromigna">Oromigna</option>
              <option value="english">English</option>
            </select>
          ) : (
            <p className="text-gray-400 text-xs leading-relaxed">
              {user?.workerProfile?.preferredLanguage || 'Amharic'}
            </p>
          )}
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-[1.5rem] p-6 md:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                AI Agent Preferences
              </h3>
              <p className="text-[10px] text-white/30">Auto-matching and one-click applications</p>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
                <span className="text-gray-300 text-xs font-bold">Auto-Apply</span>
                <button
                  disabled={loading}
                  onClick={toggleAutoApply}
                  className={`w-11 h-6 rounded-full transition-all relative ${
                    user?.workerProfile?.agentPreferences?.autoApply ? 'bg-[#2BB8B8]' : 'bg-gray-700'
                  } ${loading ? 'opacity-50' : 'cursor-pointer'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-300 ${
                      user?.workerProfile?.agentPreferences?.autoApply ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;