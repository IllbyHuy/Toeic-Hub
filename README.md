<div align="center">

# 🎓 TOEIC HUB

**A Modern, Full-Stack TOEIC Preparation & Vocabulary Learning Platform**

[![React](https://img.shields.io/badge/React-18.x-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_Cloud-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

[Live Demo](#-live-demo) • [Key Features](#-key-features) • [Tech Stack](#-tech-stack) • [System Architecture](#-system-architecture) • [Getting Started](#-getting-started) • [Environment Variables](#-environment-variables)

</div>

---

## 🌟 Overview

**TOEIC Hub** is an end-to-end web application built to help learners master the TOEIC exam through simulated test environments, adaptive vocabulary flashcards, AI-powered dictionary lookup, and gamified progress tracking.

---

## 🚀 Live Demo

- **Frontend Application:** *Deploying on Vercel*
- **Backend API:** *Deploying on Render*

---

## ✨ Key Features

### 🎧 1. Full TOEIC Test Simulation
- Realistic Listening (Part 1 - 4 with custom audio player) and Reading (Part 5 - 7) test modes.
- Strict countdown timer, progress tracker, and automatic scoring with answer explanations.

### 🗂️ 2. Smart Flashcards & Topic Vocabulary
- Topic-based vocabulary sets (Business, Office, Travel, Shopping, etc.).
- Audio pronunciation, example sentences, synonyms, and progress completion tags.

### 📖 3. Interactive AI-Powered Dictionary
- Quick word search with phonetics, definitions, and context examples.
- Powered by Google Gemini AI for contextual explanation and real-world usage.

### 🏆 4. Gamification & Leaderboard
- Top learner rankings, study streaks, and points system.
- Comprehensive score history and analytics to track improvement over time.

### 🛡️ 5. User Profiles & Cloud Management
- Secure JWT-based authentication with bcrypt encryption.
- Public profile showcase, avatar uploads integrated with Cloudinary CDN.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, React Router v6, Axios, Lucide React |
| **Backend** | Node.js, Express.js, Prisma ORM, JSON Web Token (JWT), Multer, Cloudinary SDK |
| **Database** | PostgreSQL (Serverless via Neon Cloud) |
| **AI Integration** | Google Gemini API (Natural Language Analysis & Example Generation) |
| **DevOps / Tooling** | Git, Vercel (FE Hosting), Render (BE Hosting) |

---

## 📁 Project Structure

```text
Toeic-Hub/
├── frontend/                # Client-side React Application
│   ├── src/
│   │   ├── components/      # Reusable UI components (Navbar, AudioPlayer, Modal...)
│   │   ├── pages/           # Application views (Landing, Test, Flashcard, Dictionary...)
│   │   ├── services/        # Axios API client & interceptors
│   │   └── context/         # Auth & global state management
│   └── package.json
│
├── backend/                 # Server-side RESTful API
│   ├── prisma/
│   │   └── schema.prisma    # PostgreSQL Schema & Relations
│   ├── src/
│   │   ├── controllers/     # Business logic & Route handlers
│   │   ├── routes/          # API endpoint declarations (/api/v1/...)
│   │   ├── middlewares/     # JWT Auth, error handling & upload filters
│   │   └── services/        # Third-party integrations (Cloudinary, Gemini AI)
│   └── package.json
│
└── README.md
```

---

## 💻 Getting Started Locally

### Prerequisites
- **Node.js**: `v18.x` or higher
- **npm** or **yarn**
- PostgreSQL database instance (Local or [Neon](https://neon.tech))

### 1. Clone the repository
```bash
git clone https://github.com/your-username/toeic-hub.git
cd toeic-hub
```

### 2. Configure Backend
```bash
cd backend
npm install

# Copy environment template & add your credentials
cp .env.example .env

# Push Prisma schema to your PostgreSQL database
npx prisma db push

# Start development server
npm run dev
```
Backend will be running at `http://localhost:5000`.

### 3. Configure Frontend
```bash
cd ../frontend
npm install

# Copy environment template
cp .env.example .env

# Start frontend development server
npm run dev
```
Frontend will be running at `http://localhost:5173`.

---

## 🔐 Environment Variables

### Backend (`backend/.env`)
| Variable | Description |
|---|---|
| `PORT` | Backend server port (Default: `5000`) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for signing JWT tokens |
| `JWT_EXPIRES_IN` | Token expiration duration (e.g. `7d`) |
| `CLOUDINARY_CLOUD_NAME`| Cloudinary cloud name for media uploads |
| `CLOUDINARY_API_KEY` | Cloudinary API Key |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret |
| `GEMINI_API_KEY` | Google Gemini AI API key |

### Frontend (`frontend/.env`)
| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend API URL (Default: `http://localhost:5000/api/v1`) |

---

## 👨‍💻 Author

- **GitHub:** [@your-username](https://github.com/your-username)
- **Email:** your-email@gmail.com
- **LinkedIn:** [Your LinkedIn Profile](https://linkedin.com)
