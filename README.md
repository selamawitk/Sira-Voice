# Sira-Voice

**AI Job Agent for the Informal Workforce** — *Just speak — Sira finds, applies, and manages jobs for you.*

Sira-Voice is a voice-first AI job agent for Ethiopia's informal workforce. Workers speak in Amharic, Afaan Oromo, or English; an AI agent builds their CV, matches them to jobs, auto-applies, and manages contracts — all by voice.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 + Vite 8 + Tailwind CSS 4 (PWA, mobile-first) |
| **Backend** | Node.js + Express (ESM) |
| **Database** | MongoDB (Mongoose ODM) |
| **AI** | Google Gemini API (intent parsing, matching, scam detection) |
| **Speech** | Groq Whisper (STT) |
| **Auth** | Passkey (WebAuthn), Google OAuth, JWT |
| **Maps** | Leaflet.js + OpenStreetMap |
| **Real-time** | Socket.io (notifications, messaging, typing indicators) |
| **Push** | Web Push API (VAPID) |
| **Payments** | Chapa (Ethiopian payment gateway) |
| **SMS** | Africa's Talking (OTP, alerts) |

---

## Features

### For Workers
- **Voice-to-CV** — Speak your skills, Sira builds your profile
- **AI Job Matching** — Background agent scans listings and notifies you
- **Auto-Apply** — Optional; agent applies to matching jobs automatically
- **Biometric Login** — Face/fingerprint passkey auth, no passwords needed
- **Messaging & Contracts** — Chat with employers, sign digital contracts
- **Wallet & Payments** — Track earnings, request withdrawals via Chapa

### For Employers
- **Voice Job Posting** — Speak job details, Sira creates the listing
- **AI Candidate Ranking** — Workers ranked by skills, distance, rating
- **GPS Job Verification** — Workers check in at the job site
- **Trust System** — Star ratings, reviews, verified worker badges
- **Scam Detection** — AI analyzes postings for fraudulent content

### Platform
- **Push Notifications** — Real-time alerts via Service Worker + Web Push
- **Offline Resilience** — Service Worker caching + retry logic
- **Multi-language** — Amharic, Afaan Oromo, English
- **PWA** — Installable on mobile, works offline
- **Admin Dashboard** — User management, scam logs, system oversight

---

## Project Structure

```
├── frontend/               # React + Vite SPA
│   ├── src/
│   │   ├── pages/          # Route pages (Worker, Employer, Admin, Auth, Landing)
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # React context providers
│   │   ├── hooks/          # Custom hooks (useVoice, useAgent)
│   │   ├── services/       # API client, push service, socket service
│   │   └── utils/          # Formatters, validators, geo utils
│   ├── public/             # Static assets, icons, manifest
│   └── vite.config.js      # Vite + PWA config
│
├── backend/                # Node.js + Express API
│   ├── src/
│   │   ├── controllers/    # Route handlers
│   │   ├── services/       # Business logic (AI, voice, push, payment)
│   │   ├── models/         # Mongoose schemas
│   │   ├── routes/         # Express route definitions
│   │   ├── middleware/      # Auth, error handling, multer
│   │   ├── config/         # DB, socket, passport config
│   │   └── utils/          # Helpers (OTP, tokens, cron)
│   └── server.js           # Entry point
│
├── .gitignore
└── README.md
```

---

## Setup & Development

### Prerequisites
- Node.js 18+
- MongoDB Atlas (or local MongoDB)
- Google Gemini API key
- Groq API key (for Whisper STT)
- Google OAuth credentials
- Chapa test credentials
- Africa's Talking sandbox credentials

### Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

```bash
cp backend/.env.example backend/.env
```

Key variables you must set:

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret |
| `SESSION_SECRET` | Express session secret |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GEMINI_API_KEY` | Google Gemini API key |
| `GROQ_API_KEY` | Groq API key for Whisper STT |
| `VAPID_PUBLIC_KEY` | Web Push VAPID public key |
| `VAPID_PRIVATE_KEY` | Web Push VAPID private key |
| `FRONTEND_URL` | Frontend URL (for CORS + OAuth redirect) |
| `BACKEND_URL` | Backend URL (for CSP + OAuth) |

### Run Backend

```bash
cd backend
npm install
npm run dev       # nodemon with hot reload
```

### Run Frontend

```bash
cd frontend
npm install
npm run dev       # Vite dev server on port 5173
```

---

## Deployment

### Frontend → Vercel

1. Push to GitHub
2. Import repo in Vercel (root: `frontend/`)
3. Set env vars in Vercel dashboard:
   - `VITE_API_URL` → `https://your-backend.onrender.com`
   - `VITE_BACKEND_URL` → `https://your-backend.onrender.com`
4. Deploy — Vite builds to `dist/`, `vercel.json` handles SPA routing

### Backend → Render

1. Create a Web Service from your repo
2. Root directory: `backend/`
3. Build command: `npm install`
4. Start command: `node src/server.js`
5. Set all env vars in Render dashboard (see `.env.example`)
6. Ensure `NODE_ENV=production` and `PORT=10000` (Render default)

### Google OAuth

Add both URLs to your Google Cloud Console OAuth client:
- Authorized Redirect URIs:
  - `http://localhost:5001/api/auth/google/callback`
  - `https://your-backend.onrender.com/api/auth/google/callback`
- Authorized JavaScript Origins:
  - `http://localhost:5173`
  - `https://your-frontend.vercel.app`

---

## API Overview

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/register` | Register with email/phone + password |
| `POST /api/auth/login` | Login with email + password |
| `GET /api/auth/google` | Google OAuth login |
| `POST /api/auth/passkey/register-options` | Start passkey registration |
| `POST /api/auth/passkey/verify-registration` | Complete passkey registration |
| `POST /api/auth/passkey/login-options` | Start passkey login |
| `POST /api/auth/passkey/verify-login` | Complete passkey login |
| `GET /api/jobs` | List jobs (with geo search) |
| `POST /api/jobs` | Create job |
| `POST /api/applications/:jobId/apply` | Apply to job |
| `POST /api/ai/voice-action` | Process voice command |
| `POST /api/voice/voice-action` | Extended voice processing |
| `GET /api/chat` | List conversations |
| `GET /api/notifications` | List notifications |
| `POST /api/push/subscribe` | Subscribe to push notifications |
| `GET /api/push/vapid-public-key` | Get VAPID public key |
| `POST /api/payments/initialize` | Initialize Chapa payment |
| `POST /api/payments/webhook` | Chapa webhook handler |

Full route documentation is available in `backend/src/routes/`.

---

## License

Private / Proprietary
