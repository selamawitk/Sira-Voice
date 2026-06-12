
Sira-Voice  
AI Job Agent for the Informal Workforce
“Just speak — Sira finds, applies, and manages jobs for you.”

Finding everyday work or hiring reliable local labor shouldn't depend on expensive, unregulated brokers (Delalas). Sira-Voice is an agency-grade, voice-first AI job agent engineered specifically for the informal workforce in Ethiopia.

Instead of forcing users to navigate complex forms or type out resumes, Sira-Voice uses a Voice-First, Not Voice-Only infrastructure. Workers simply speak their skills in their native language—Amharic, Afan Oromo, or English—and an intelligent AI background agent handles profile generation, real-time localized job matching, and automatic application workflows.

 The Big Shift
Before: Workers spend hours manually searching listings ➔ filling out static text forms ➔ paying hefty middleman broker cuts ➔ dealing with unverified, risky job postings.

Now: Workers just speak naturally ➔ the AI agent instantly parses skills and updates their voice-CV ➔ applications are automated in the background ➔ localized trust systems completely replace the broker network.

 Killer Features
1. Autonomous AI Job Agent & Dynamic Voice-to-CV
The crown jewel of the platform. A worker says, "I'm a plumber with 3 years of experience living in Megenagna." The system processes the audio through a speech-to-text pipeline (Whisper/Google STT APIs) into the Gemini API, which extracts structural metadata { skill: "Plumber", experience: "3 years", location: "Megenagna" } to build a robust profile instantly with zero typing.

2. Smart Dual-Sided Matching Engine
For Workers: Continuously scans incoming listings in the background, matching profiles dynamically so jobs seamlessly "come to the worker."

For Employers: Allows fast voice-based job postings ("Need 2 cleaners tomorrow in Bole"). The engine instantaneously ranks nearby matching talent by distance, ratings, and explicit skills for a 1-click hire experience.

3. Biometric Identity & Delala-Replacement Trust Layer
Biometric Authentication: Replaced traditional, clunky password/voice auth with fast, low-data biometric device check-ins to secure worker profiles instantly.

Trust Framework: Features bidirectional star ratings, complete historical ledgers, verified worker badges, and secure GPS job validation.

4. Localized Location Intelligence (100% Free Open Source)
Utilizes Leaflet.js and OpenStreetMap to map out available opportunities and worker spreads dynamically. Includes distance-based candidate ranking and hardware-level GPS tracking to ensure jobs are verified at the physical site.

5. Multi-Language AI Inclusion
Built intentionally to drive local impact. The AI models safely interpret and support local dialects across Amharic, Afan Oromo, and English, allowing users to review and manually edit their transcribed text fallbacks if background noise disrupts the audio.  
platform.addisassistant.com

6. AI Scam & Fake Job Detection
The backend agent runs intent analysis and keyword threat models over employer postings to flag fake accounts, detect suspicious payment layouts, and protect vulnerable daily wage earners.

System Architecture
Frontend: React.js / Next.js (Mobile-First, PWA optimized)

Backend: Node.js + Express.js (Clean, controller-service architecture)

Database: MongoDB (Schemas tracking coordinates, history, and metadata)

AI Engine: Gemini API Core (For semantic extraction, matching, and moderation)

Voice Pipeline: OpenAI Whisper / Google Speech-to-Text APIs

Mapping: Leaflet.js + OpenStreetMap (Fully free, cached, and low-data friendly)

Real-time Engine: Socket.io (Instant application alerts and employer hiring updates)

