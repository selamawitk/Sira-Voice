import User from '../models/User.js';
import { calculateDistance } from '../utils/distance.js';

const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .trim();

export const findMatchingWorkers = async (job) => {
  // 1. Query workers filtering on the correct master profile preference path
  const activeWorkers = await User.find({
    role: 'worker',
    $or: [
      { isAgentActive: true },
      { 'workerProfile.agentPreferences.autoApply': true }
    ]
  });

  // Create the job requirement text corpus
  const jobCorpus = normalizeText(
    `${job.category || ''} ${job.title || ''} ${job.description || ''}`
  );

  const rankedMatches = activeWorkers
    .map((worker) => {
      // 2. Extract Worker Profile Data
      const skills = (worker.workerProfile?.skills || []).map((skill) =>
        normalizeText(skill)
      );
      
      const workerCategory = normalizeText(worker.workerProfile?.category || '');
      const preferredLanguage = normalizeText(worker.workerProfile?.preferredLanguage || 'amharic');
      const jobLanguage = normalizeText(job.preferredLanguage || 'amharic');
      
      const experienceYears = worker.workerProfile?.experienceYears || 0;
      const rating = worker.workerProfile?.averageRating || worker.workerProfile?.rating || 0;
      const maxDistance = worker.workerProfile?.agentPreferences?.maxDistance || 15;

      // 3. Proximity Check (GPS Distance)
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

      // Boundary check using worker baseline max preference or 30km safety buffer
      if (distance > maxDistance && distance > 30) {
        return null;
      }

      // 4. Requirement Core Matching Checks
      // Check specific skill keyword overlap
      const skillHits = skills.reduce((count, skill) => {
        if (!skill) return count;
        return jobCorpus.includes(skill) ? count + 1 : count;
      }, 0);

      // Check overarching functional business category match
      const isCategoryMatch = workerCategory && jobCorpus.includes(workerCategory);
      
      // Check preferred language alignment
      const isLanguageMatch = preferredLanguage === jobLanguage;

      // Tight requirement constraint: Worker must match either specific baseline skills OR the overall profile job category
      if (skillHits === 0 && !isCategoryMatch) {
        return null;
      }

      // =========================================================
      // 5. THE AI RANKING SCORE SYSTEM (Strict Requirement Focus)
      // =========================================================
      
      // A. Requirements Match (Max 45 points)
      const skillScore = skillHits > 0 ? Math.min(25, skillHits * 10 + 5) : 0;
      const categoryScore = isCategoryMatch ? 15 : 0;
      const languageScore = isLanguageMatch ? 5 : 0;
      const totalRequirementsScore = skillScore + categoryScore + languageScore;

      // B. Proximity Alignment Score (Max 25 points)
      // Highly rewards workers closest to the work site location
      const proximityScore = Math.max(0, 25 - distance * 1.2);

      // C. Professional Performance Metrics (Max 20 points)
      const experienceScore = Math.min(10, experienceYears * 1.5);
      const ratingScore = Math.min(10, rating * 2);

      // D. Trust & Platform Status Bonuses (Max 10 points)
      const verifiedBonus = worker.isVerified ? 6 : 0;

      // Compile final weighted match score (Guaranteed scale boundary between 0 - 100)
      const finalMatchScore = Math.min(
        100,
        Math.round(
          totalRequirementsScore + proximityScore + experienceScore + ratingScore + verifiedBonus
        )
      );

      // 6. Return Payload customized for Employer dashboard transparency
      return {
        worker: {
          _id: worker._id,
          fullName: worker.fullName,
          phone: worker.phone,
          isVerified: worker.isVerified,
          workerProfile: worker.workerProfile
        },
        _id: worker._id,
        fullName: worker.fullName,
        distance: distance.toFixed(2),
        score: finalMatchScore, // The principal sorting attribute
        breakdown: {
          requirementsMatch: Math.round((totalRequirementsScore / 45) * 100), // % match of skills/category
          proximityScore: Math.round(proximityScore),
          rating
        },
        experienceYears,
        skillHits,
        maxDistance
      };
    })
    .filter(Boolean)
    // Sort descending by highest requirement compliance score
    .sort((a, b) => b.score - a.score);

  return rankedMatches;
};