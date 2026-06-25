import React, { useContext, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api.js';
import { AuthContext } from '../../context/AuthContextInstance.jsx';
import { ToastContext } from '../../components/ui/ToastContextInstance.jsx';
import { Loader2 } from 'lucide-react';

const ChooseRolePage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const toast = useContext(ToastContext);
  const [loading, setLoading] = useState(false);

  const token = params.get('token');

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      auth?.fetchMe?.();
    }
  }, [token, auth]);

  const selectRole = async (role) => {
    setLoading(true);
    try {
      await api.post('/auth/set-role', { role });
      toast?.show?.('Role set successfully!', 'success');

      if (auth?.fetchMe) {
        await auth.fetchMe();
      }

      if (role === 'employer') {
        navigate('/employer-dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      toast?.show?.(err.response?.data?.message || 'Role selection failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center gap-6 bg-[#1A2E35] text-white">
      <h1 className="text-3xl font-black">Choose Your Role</h1>
      <p className="text-white/60">Select how you want to use Sira Voice</p>

      <div className="flex gap-4 mt-4">
        <button
          onClick={() => selectRole('worker')}
          disabled={loading}
          className="px-8 py-4 bg-[#2BB8B8] text-slate-950 rounded-2xl font-black hover:scale-105 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          Worker
        </button>

        <button
          onClick={() => selectRole('employer')}
          disabled={loading}
          className="px-8 py-4 bg-white/10 text-white border border-white/20 rounded-2xl font-black hover:bg-white/20 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          Employer
        </button>
      </div>
    </div>
  );
};

export default ChooseRolePage;