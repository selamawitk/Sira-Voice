import cron from 'node-cron';
import Job from '../models/Job.js';
import User from '../models/User.js';
import Application from '../models/Application.js';
import { findMatchingWorkers } from '../services/jobMatcher.js';
import { sendAIAgentNotification } from '../services/notificationService.js';
import { createApplicationLogic } from '../controllers/applicationController.js';

export const initCronJobs = (io) => {
  cron.schedule('*/5 * * * *', async () => {
    console.log('AI Agent: Scanning for new matches...');
    
    try {
      const recentThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const newJobs = await Job.find({ 
        createdAt: { $gte: recentThreshold },
        status: 'open' 
      });

      for (const job of newJobs) {
        const rankedMatches = await findMatchingWorkers(job);

        const existingApps = await Application.find({ job: job._id }).select('worker');
        const alreadyApplied = new Set(existingApps.map(a => a.worker.toString()));

        for (const match of rankedMatches) {
          const workerId = match._id;
          const score = match.score;
          const reasons = match.reasons || [];

          if (!workerId || alreadyApplied.has(workerId.toString())) continue;

          const worker = await User.findById(workerId);
          if (!worker) continue;

          const autoApply = worker.workerProfile?.agentPreferences?.autoApply;

          if (autoApply && score >= 60) {
            try {
              await createApplicationLogic(job._id, workerId, io, true, score);
              console.log(`Auto-Applied: Worker ${worker.fullName} (score: ${score}) to Job ${job.title}`);
            } catch (err) {
              if (err.statusCode !== 400) {
                console.error(`Auto-Apply failed for worker ${workerId}:`, err.message);
              }
            }
          } else {
            const reasonText = reasons.length > 0 ? reasons.slice(0, 3).join(', ') : `${score}% match`;
            await sendAIAgentNotification(
              io,
              workerId,
              `Match: ${score}% - ${job.title}`,
              `New ${job.category} job matches your profile. ${reasonText}.`,
              { jobId: job._id, matchScore: score, matchReasons: reasons }
            );
          }
        }
      }
    } catch (error) {
      console.error('AI Agent Cron Error:', error.message);
    }
  });
};
