import Application from '../models/Application.js';
import Job from '../models/Job.js';
import Contract from '../models/Contract.js';

export const processHiring = async (applicationId, status) => {
  const application = await Application.findById(applicationId).populate('job worker');
  
  if (!application) throw new Error('Application not found');

  application.status = status;
  await application.save();

  if (status === 'accepted') {
    await Job.findByIdAndUpdate(application.job._id, { status: 'in-progress' });

    await Contract.create({
      employerId: application.job.employer,
      workerId: application.worker._id,
      jobId: application.job._id,
      paymentType: application.job.paymentType || 'fixed',
      agreedAmount: application.job.salary,
      status: 'active',
      escrowStatus: 'pending'
    });
  }

  if (status === 'completed') {
    await Job.findByIdAndUpdate(application.job._id, { status: 'completed' });
    
    await Contract.findOneAndUpdate(
      { jobId: application.job._id, workerId: application.worker._id, status: 'active' },
      { status: 'completed' }
    );
  }

  return application;
};