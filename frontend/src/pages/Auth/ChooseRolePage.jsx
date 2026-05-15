import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';

const ChooseRolePage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const token = params.get('token');

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    }
  }, [token]);

  const selectRole = async (role) => {
    try {
      await api.post('/auth/set-role', { role });

      if (role === 'employer') {
        navigate('/employer-dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Role selection failed:', err);
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center gap-6 bg-gray-950 text-white">
      <h1 className="text-2xl font-bold">Choose Your Role</h1>

      <div className="flex gap-4">
        <button
          onClick={() => selectRole('worker')}
          className="px-6 py-3 bg-teal-500 rounded-lg font-bold"
        >
          Worker
        </button>

        <button
          onClick={() => selectRole('employer')}
          className="px-6 py-3 bg-blue-500 rounded-lg font-bold"
        >
          Employer
        </button>
      </div>
    </div>
  );
};

export default ChooseRolePage;