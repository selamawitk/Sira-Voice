import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.MongoURI;
if (!uri) {
  console.error('Missing MONGO_URI env var');
  process.exit(1);
}

const jobs = [
  {
    title: 'Daily Construction Worker',
    category: 'construction',
    description: 'Need experienced daily laborer for building renovation project in Bole. Tasks include mixing cement, carrying bricks, and assisting masons. 8-hour shift with lunch break. Tools provided.',
    location: {
      type: 'Point',
      address: 'Bole, Addis Ababa',
      coordinates: [38.7636, 9.0227],
    },
    salary: 600,
    paymentType: 'daily',
    status: 'open',
  },
  {
    title: 'Weekly House Cleaner',
    category: 'cleaning',
    description: 'Looking for a cleaner to maintain a 3-bedroom house in CMC area twice a week. Duties: sweeping, mopping, dusting, bathroom cleaning. Supplies provided.',
    location: {
      type: 'Point',
      address: 'CMC, Addis Ababa',
      coordinates: [38.7914, 9.0245],
    },
    salary: 3500,
    paymentType: 'weekly',
    status: 'open',
  },
  {
    title: 'Restaurant Server - Monthly',
    category: 'hospitality',
    description: 'Full-time server position at a busy restaurant in Piassa. Evening shifts (5pm-11pm). Must be friendly, able to carry trays, and take orders. Training provided.',
    location: {
      type: 'Point',
      address: 'Piassa, Addis Ababa',
      coordinates: [38.7465, 9.0471],
    },
    salary: 8000,
    paymentType: 'monthly',
    status: 'open',
  },
];

const run = async () => {
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const User = (await import('../src/models/User.js')).default;
    const Job = (await import('../src/models/Job.js')).default;

    const employer = await User.findOne({ role: 'employer' });
    if (!employer) {
      console.error('No employer user found. Create an employer account first.');
      process.exit(1);
    }

    const count = await Job.countDocuments({ employer: employer._id });
    if (count > 0) {
      console.log(`${count} jobs already exist for this employer. Skipping seed.`);
      await mongoose.disconnect();
      return;
    }

    const withEmployer = jobs.map((j) => ({ ...j, employer: employer._id }));
    await Job.insertMany(withEmployer);
    console.log(`Inserted ${jobs.length} mock jobs for employer: ${employer.fullName ?? employer.email}`);

    await mongoose.disconnect();
    console.log('Done.');
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
};

run();
