import { useContext } from 'react';
import { AuthContext } from '../context/AuthContextInstance.jsx';
import api from '../services/api.js';

export const useAgent = () => {
  const auth = useContext(AuthContext);
  const user = auth?.user;

  const toggleAgent = async () => {
    await api.put('/users/agent-toggle');
    await auth?.fetchMe?.();
  };

  const updatePrefs = async (prefs) => {
    await api.put('/users/agent-preferences', prefs);
    await auth?.fetchMe?.();
  };

  return { isAgentActive: user?.isAgentActive, toggleAgent, updatePrefs };
};