import User from '../models/User.js';
import { calculateDistance } from '../utils/distance.js';

const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .trim();

export const findMatchingWorkers = async (job) => {
  const activeWorkers = await User.find({
    role: 'worker',
    $or: [
      { isAgentActive: true },
      { 'workerProfile.agentPreferences.autoApply': true }
    ]
  });

  const jobCorpus = normalizeText(
    `${job.category || ''} ${job.title || ''} ${job.description || ''}`
  );

  const rankedMatches = activeWorkers
    .map((worker) => {
      const skills = (worker.workerProfile?.skills || []).map((skill) =>
        normalizeText(skill)
      );
      
      const workerCategory = normalizeText(worker.workerProfile?.category || '');
      const preferredLanguage = normalizeText(worker.workerProfile?.preferredLanguage || 'amharic');
      const jobLanguage = normalizeText(job.preferredLanguage || 'amharic');
      
      const experienceYears = worker.workerProfile?.experienceYears || 0;
      const rating = worker.workerProfile?.averageRating || worker.workerProfile?.rating || 0;
      const maxDistance = worker.workerProfile?.agentPreferences?.maxDistance || 15;
      const reasons = [];

      if (
        !worker.location?.coordinates ||
        worker.location.coordinates.length < 2 ||
        !job.location?.coordinates ||
        job.location.coordinates.length < 2
      ) {
        return null;
      }

      const distance = parseFloat(
        calculateDistance(
          job.location.coordinates[1],
          job.location.coordinates[0],
          worker.location.coordinates[1],
          worker.location.coordinates[0]
        ) || 0
      );

      if (distance > maxDistance && distance > 30) {
        return null;
      }

      const skillHits = skills.reduce((count, skill) => {
        if (!skill) return count;
        return jobCorpus.includes(skill) ? count + 1 : count;
      }, 0);

      const isCategoryMatch = workerCategory && jobCorpus.includes(workerCategory);
      
      const isLanguageMatch = preferredLanguage === jobLanguage;

      if (skillHits === 0 && !isCategoryMatch) {
        return null;
      }

      if (skillHits > 0) reasons.push('Skill matched');
      if (isCategoryMatch) reasons.push('Category match');
      if (isLanguageMatch) reasons.push('Language match');
      if (distance <= 2) reasons.push('Very nearby');
      else if (distance <= 5) reasons.push('Nearby');
      if (experienceYears >= 3) reasons.push('Experienced');
      if (rating >= 4) reasons.push('Good rating');
      if (rating >= 4.5) reasons.push('High rating');
      if (worker.isVerified) reasons.push('Verified worker');

      const skillScore = skillHits > 0 ? Math.min(25, skillHits * 10 + 5) : 0;
      const categoryScore = isCategoryMatch ? 15 : 0;
      const languageScore = isLanguageMatch ? 5 : 0;
      const totalRequirementsScore = skillScore + categoryScore + languageScore;

      const proximityScore = Math.max(0, 25 - distance * 1.2);

      const experienceScore = Math.min(10, experienceYears * 1.5);
      const ratingScore = Math.min(10, rating * 2);

      const verifiedBonus = worker.isVerified ? 6 : 0;
      
      const finalMatchScore = Math.min(
        100,
        Math.round(
          totalRequirementsScore + proximityScore + experienceScore + ratingScore + verifiedBonus
        )
      );

      return {
        worker: {
          _id: worker._id,
          fullName: worker.fullName,
          phone: worker.phone,
          isVerified: worker.isVerified,
          workerProfile: worker.workerProfile,
          location: worker.location,
        },
        _id: worker._id,
        fullName: worker.fullName,
        distance: distance.toFixed(2),
        score: finalMatchScore,
        reasons: reasons.slice(0, 5),
        breakdown: {
          requirementsMatch: Math.round((totalRequirementsScore / 45) * 100),
          proximityScore: Math.round(proximityScore),
          rating
        },
        experienceYears,
        skillHits,
        maxDistance
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  return rankedMatches;
};
