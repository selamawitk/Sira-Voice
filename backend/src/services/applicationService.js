import Application from '../models/Application.js';
import Job from '../models/Job.js';

export const processHiring = async (applicationId, status) => {
  const application = await Application.findById(applicationId).populate('job worker');
  
  if (!application) throw new Error('Application not found');

  // Update Application Status
  application.status = status;
  await application.save();

  // If Hired, mark the Job as "In-Progress"
  if (status === 'accepted') {
    await Job.findByIdAndUpdate(application.job._id, { status: 'in-progress' });
  }

  // If Completed, mark Job as "Completed" (Feature #5: Trust System)
  if (status === 'completed') {
    await Job.findByIdAndUpdate(application.job._id, { status: 'completed' });
    // This triggers the Rating flow next
  }

  return application;
};