import api from './api.js';

export const jobService = {
  getAllJobs: async () => {
    const res = await api.get('/jobs');
    return res.data;
  },
  applyToJob: async (jobId) => {
    // Backend: POST /api/applications/:jobId/apply
    const res = await api.post(`/applications/${jobId}/apply`);
    return res.data;
  }
};