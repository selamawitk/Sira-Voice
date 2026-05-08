import cron from 'node-cron';
import Job from '../models/Job.js';
import User from '../models/User.js';
import { sendRealTimeNotification } from '../services/notificationService.js';
import { createApplicationLogic } from '../controllers/applicationController.js';

export const initCronJobs = (io) => {
  cron.schedule('*/5 * * * *', async () => {
    console.log('🤖 Sira Agent: Scanning for new matches...');
    
    try {
      const recentThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const newJobs = await Job.find({ 
        createdAt: { $gte: recentThreshold },
        status: 'open' 
      });

      for (const job of newJobs) {
        const matchingWorkers = await User.find({
          role: 'worker',
          isAgentActive: true,
          $or: [
            { 'workerProfile.skills': { $regex: job.category, $options: 'i' } },
            { 'workerProfile.bio': { $regex: job.category, $options: 'i' } }
          ],
          'location.address': { $regex: job.location.address, $options: 'i' }
        }).limit(10);

        for (const worker of matchingWorkers) {
          const hasAutoApplyAccess = worker.isPremium === true;

          if (hasAutoApplyAccess && worker.workerProfile.agentPreferences?.autoApply) {
            try {
              await createApplicationLogic(job._id, worker._id, io, true);
              console.log(`✅ Auto-Applied: Worker ${worker.fullName} to Job ${job.title}`);
            } catch (err) {
              if (err.statusCode !== 400) {
                console.error(`Auto-Apply failed for worker ${worker._id}:`, err.message);
              }
            }
          } else {
            await sendRealTimeNotification(io, worker._id, {
              title: "Sira Agent found a match! 🎯",
              message: `A new ${job.category} job was posted in ${job.location.address}. It fits your profile perfectly!`,
              jobId: job._id,
              type: "match"
            });
          }
        }
      }
    } catch (error) {
      console.error('AI Agent Cron Error:', error.message);
    }
  });
};