import express from 'express';
import { createServer } from 'http';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import session from 'express-session';
import passport from 'passport';
import helmet from 'helmet';
import MongoStore from 'connect-mongo';

import './config/passport.js';

import connectDB from './config/db.js';
import { initSocket } from './config/socket.js';
import errorHandler from './middleware/errorHandlerMiddleware.js';
import { initCronJobs } from './utils/cronJob.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import voiceRoutes from './routes/voiceRoutes.js';
import ratingRoutes from './routes/ratingRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import chatRoutes from './routes/chatRoutes.js';

dotenv.config();

const requiredEnvVars = [
  'JWT_SECRET',
  'SESSION_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'MONGO_URI',
];

const missingVars = requiredEnvVars.filter(
  (key) => !process.env[key]
);

if (missingVars.length > 0) {
  console.error('\n❌ Missing environment variables:\n');

  missingVars.forEach((key) => {
    console.error(`- ${key}`);
  });

  process.exit(1);
}

const app = express();
const httpServer = createServer(app);

await connectDB();

const io = initSocket(httpServer);
app.set('io', io);

app.set('trust proxy', 1);

const frontendUrl =
  process.env.FRONTEND_URL || 'http://localhost:5173';

const allowedOrigins = [
  frontendUrl,
  'http://localhost:5173',
];

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },

    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],

        connectSrc: [
          "'self'",
          frontendUrl,
          process.env.BACKEND_URL || 'http://localhost:5001',
          'ws://localhost:5001',
          'wss:',
        ],

        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https:',
        ],

        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https:',
        ],

        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
        ],

        fontSrc: [
          "'self'",
          'https:',
          'data:',
        ],

        objectSrc: ["'none'"],

        frameAncestors: ["'none'"],
      },
    },
  })
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error(`CORS blocked for origin: ${origin}`)
      );
    },

    credentials: true,

    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
    ],
  })
);

app.use(express.json({ limit: '10mb' }));

app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb',
  })
);

app.use(
  session({
    name: 'sira.sid',

    secret: process.env.SESSION_SECRET,

    resave: false,

    saveUninitialized: false,

    rolling: true,

    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: 'sessions',
      ttl: 24 * 60 * 60,
    }),

    cookie: {
      httpOnly: true,

      secure: process.env.NODE_ENV === 'production',

      sameSite:
        process.env.NODE_ENV === 'production'
          ? 'none'
          : 'lax',

      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use('/uploads', express.static(uploadDir));

app.use((req, res, next) => {
  req.io = io;
  next();
});

initCronJobs(io);

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Sira Voice API running',
    environment:
      process.env.NODE_ENV || 'development',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5001;

httpServer.listen(PORT, () => {
  console.log(`
Sira Voice Server Running
Environment: ${process.env.NODE_ENV}
Port: ${PORT}
`);
});