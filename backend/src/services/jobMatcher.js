import User from '../models/User.js';
import { calculateDistance } from '../utils/distance.js';

export const findMatchingWorkers = async (job) => {
  // 1. Fetch only relevant active workers to save memory
  const activeWorkers = await User.find({ 
    role: 'worker', 
    isAgentActive: true 
  });

  const rankedMatches = activeWorkers
    .map(worker => {
      // 2. Skill Match Logic
      const hasSkill = worker.workerProfile.skills.some(skill => 
        job.category.toLowerCase().includes(skill.toLowerCase()) ||
        job.title.toLowerCase().includes(skill.toLowerCase())
      );

      if (!hasSkill) return null;

      // 3. GPS Distance Logic (7km constraint)
      const distance = calculateDistance(
        job.location.coordinates[1], 
        job.location.coordinates[0], 
        worker.location.coordinates[1],
        worker.location.coordinates[0]
      );

      if (distance > 7) return null;

      // 4. Scoring Algorithm (The "Smart" part)
      // Base score 10. +5 for Verified. + (Rating * 2).
      const rating = worker.workerProfile.averageRating || 0;
      const verifiedBonus = worker.isVerified ? 5 : 0;
      const matchScore = 10 + (rating * 2) + verifiedBonus;

      return {
        _id: worker._id,
        fullName: worker.fullName,
        distance: distance.toFixed(2),
        score: matchScore,
        rating: rating,
        isVerified: worker.isVerified
      };
    })
    .filter(match => match !== null)
    .sort((a, b) => b.score - a.score); // Highest score first

  return rankedMatches;
};