import React, { useContext } from 'react';
import { User, MapPin, Award, ShieldCheck, Edit3 } from 'lucide-react';
import { AuthContext } from '../../context/AuthContextInstance.jsx';

const Profile = () => {
  const auth = useContext(AuthContext);
  const user = auth?.user;
  const skills = user?.workerProfile?.skills ?? [];
  const rating = user?.workerProfile?.averageRating ?? user?.workerProfile?.rating ?? 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="relative bg-white/[0.03] border border-white/10 rounded-[3rem] p-10 backdrop-blur-3xl overflow-hidden">
        {/* Decorative Glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#2BB8B8]/10 blur-[80px] rounded-full"></div>
        
        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="relative">
            <div className="w-32 h-32 rounded-[2.5rem] bg-linear-to-tr from-[#2BB8B8] to-cyan-400 p-[3px] shadow-2xl">
              <div className="w-full h-full rounded-[2.4rem] bg-[#1A2E35] flex items-center justify-center text-4xl font-black text-white">
                {(user?.fullName?.[0] ?? 'W').toUpperCase()}
              </div>
            </div>
            <button className="absolute bottom-1 right-1 bg-[#1A2E35] border border-white/10 p-2 rounded-xl text-[#2BB8B8] hover:scale-110 transition-transform">
              <Edit3 className="w-4 h-4" />
            </button>
          </div>

          <div className="text-center md:text-left flex-1">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <h1 className="text-3xl font-black text-white tracking-tight">{user?.fullName ?? 'My Profile'}</h1>
              {user?.isVerified ? <ShieldCheck className="w-6 h-6 text-[#2BB8B8]" /> : null}
            </div>
            <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-xs mt-1">
              {skills?.[0] ? `Professional ${skills[0]}` : 'Worker'}
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4">
              <span className="flex items-center gap-1.5 text-xs text-gray-500 font-bold bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                <MapPin className="w-3 h-3 text-[#2BB8B8]" /> {user?.location?.address ?? 'Addis Ababa, ET'}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500 font-bold bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                <Award className="w-3 h-3 text-[#2BB8B8]" /> {Number(rating || 0).toFixed(1)} Rating
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8">
          <h3 className="text-white font-black text-lg mb-4">Bio</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            {user?.workerProfile?.bio ??
              'Add a short bio by using Voice‑to‑CV, or update your profile with Talk to Sira.'}
          </p>
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8">
          <h3 className="text-white font-black text-lg mb-4">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {(skills.length ? skills : ['No skills yet']).map((skill) => (
              <span
                key={skill}
                className="bg-[#2BB8B8]/10 text-[#2BB8B8] text-[10px] font-black uppercase px-3 py-1.5 rounded-xl border border-[#2BB8B8]/20"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8">
          <h3 className="text-white font-black text-lg mb-4">AI Agent Preferences</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Auto-apply to jobs</span>
              <button
                className={`w-12 h-6 rounded-full transition-colors ${
                  user?.workerProfile?.agentPreferences?.autoApply ? 'bg-[#2BB8B8]' : 'bg-gray-600'
                }`}
                onClick={async () => {
                  try {
                    await api.put('/user/profile', {
                      agentPreferences: {
                        ...user.workerProfile.agentPreferences,
                        autoApply: !user.workerProfile.agentPreferences?.autoApply
                      }
                    });
                    // Refresh user data
                    window.location.reload();
                  } catch (err) {
                    console.error('Failed to update preferences');
                  }
                }}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    user?.workerProfile?.agentPreferences?.autoApply ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Max distance (km)</span>
              <input
                type="number"
                value={user?.workerProfile?.agentPreferences?.maxDistance || 10}
                onChange={async (e) => {
                  try {
                    await api.put('/user/profile', {
                      agentPreferences: {
                        ...user.workerProfile.agentPreferences,
                        maxDistance: parseInt(e.target.value)
                      }
                    });
                  } catch (err) {
                    console.error('Failed to update preferences');
                  }
                }}
                className="w-16 bg-[#1A2E35] border border-white/10 rounded px-2 py-1 text-white text-sm"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Min salary (ETB)</span>
              <input
                type="number"
                value={user?.workerProfile?.agentPreferences?.minSalary || 0}
                onChange={async (e) => {
                  try {
                    await api.put('/user/profile', {
                      agentPreferences: {
                        ...user.workerProfile.agentPreferences,
                        minSalary: parseInt(e.target.value)
                      }
                    });
                  } catch (err) {
                    console.error('Failed to update preferences');
                  }
                }}
                className="w-16 bg-[#1A2E35] border border-white/10 rounded px-2 py-1 text-white text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;