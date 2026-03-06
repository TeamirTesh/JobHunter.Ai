# JobHunter.Ai

**JobHunter.Ai** is a full-stack job application tracker that syncs with your inbox. Connect Gmail or Outlook, and the app uses AI to pull companies, roles, and status from your emails into one dashboard—so you can see every application at a glance.

---

## Features

- **Email sync** — Connect Gmail and Outlook via OAuth; job-related emails are synced automatically.
- **AI extraction** — OpenAI parses company, role, location, and status from your emails.
- **Single dashboard** — View and manage all applications (Applied, Interview, Offer, Rejected) in one place.
- **OAuth sign-in** — Log in with Google or Microsoft; optional email/password sign-up.
- **Scheduled sync** — Background job runs every 30 minutes to keep applications up to date.
- **Multiple accounts** — Connect more than one email account per user.
- **Dark UI** — Minimal, professional dashboard with a consistent dark theme.

---

## Tech Stack

| Layer    | Technologies |
|----------|--------------|
| **Backend**  | Flask, SQLAlchemy, Flask-Migrate, Google API Client, MSAL (Microsoft), OpenAI API, APScheduler |
| **Frontend** | React, Tailwind CSS, Framer Motion, Lucide React |
| **Database** | PostgreSQL (recommended), or SQLite / MySQL |

---

## Prerequisites

- **Python 3.8+**
- **Node.js 14+**
- **PostgreSQL** (or SQLite / MySQL)
- **Google OAuth** credentials (Gmail)
- **Microsoft Azure** app registration (Outlook)
- **OpenAI API** key

---

## Quick Start

### 1. Clone and enter the project

```bash
git clone https://github.com/TeamirTesh/JobHunter.Ai.git
cd JobHunter.Ai
```

### 2. Backend

```bash
# Virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate
# Activate (macOS/Linux)
source venv/bin/activate

# Dependencies
pip install -r requirements.txt
```

### 3. Environment variables

Create a `.env` file in the **project root**:

```env
# Database (use your own URL for production)
DATABASE_URL=sqlite:///instance/jobhunter.db
# Example PostgreSQL:
# DATABASE_URL=postgresql://user:password@localhost/jobhunter

# Flask
SECRET_KEY=your-secret-key-here

# Google OAuth (Gmail)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback
GMAIL_CONNECT_REDIRECT_URI=http://localhost:5000/gmail/callback

# Microsoft OAuth (Outlook)
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
MICROSOFT_TENANT_ID=common
MICROSOFT_REDIRECT_URI=http://localhost:5000/auth/microsoft/callback
OUTLOOK_CONNECT_REDIRECT_URI=http://localhost:5000/gmail/callback

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Frontend (for CORS / redirects)
FRONTEND_URL=http://localhost:3000
```

### 4. Database

**Option A – Flask-Migrate (recommended)**

```bash
cd backend
flask db upgrade
cd ..
```

**Option B – Schema script**

```bash
# SQLite
sqlite3 instance/jobhunter.db < schema.sql

# PostgreSQL
psql -U username -d database_name -f schema.sql
```

### 5. Frontend

```bash
cd Frontend
npm install
cd ..
```

### 6. Run the app

**Terminal 1 – Backend (from project root):**

```bash
python run.py
```

Backend: **http://localhost:5000**

**Terminal 2 – Frontend:**

```bash
cd Frontend
npm start
```

Frontend: **http://localhost:3000**

Open **http://localhost:3000** in your browser to use the app.

---

## OAuth Setup

### Google (Gmail)

1. [Google Cloud Console](https://console.cloud.google.com/) → create or select a project.
2. Enable **Gmail API**.
3. **APIs & Services → Credentials** → Create **OAuth 2.0 Client ID** (Web application).
4. Add **Authorized redirect URIs**:
   - `http://localhost:5000/auth/google/callback`
   - `http://localhost:5000/gmail/callback`
5. Put **Client ID** and **Client secret** in `.env`.

### Microsoft (Outlook)

1. [Azure Portal](https://portal.azure.com/) → **Azure Active Directory** → **App registrations** → **New registration**.
2. **Authentication** → Add **Redirect URI** (Web):
   - `http://localhost:5000/auth/microsoft/callback`
   - `http://localhost:5000/gmail/callback`
3. **API permissions** → Add: `User.Read`, `Mail.Read`.
4. **Certificates & secrets** → New client secret.
5. Put **Application (client) ID**, **Directory (tenant) ID**, and **Client secret** in `.env`.

---

## Project Structure

```
JobHunter.Ai/
├── backend/
│   ├── app/
│   │   ├── __init__.py          # Flask app factory
│   │   ├── models.py            # SQLAlchemy models
│   │   ├── routes/              # API routes (auth, oauth, gmail, applications, accounts)
│   │   ├── services/            # email_processor, gmail, outlook, openai
│   │   └── utils/
│   ├── migrations/              # Flask-Migrate migrations
│   └── instance/                # SQLite DB (if used)
├── Frontend/
│   ├── src/
│   │   ├── components/          # Layout, auth, email-accounts, CompanyLogo
│   │   ├── pages/               # Dashboard, Applications, Profile
│   │   └── services/            # API client
│   └── public/
├── schema.sql                   # Standalone DB schema
├── requirements.txt
├── run.py                       # Backend entry point
└── README.md
```

---

## Main API Endpoints

| Area | Method | Endpoint | Description |
|------|--------|----------|-------------|
| Auth | POST | `/auth/register` | Register (email/password) |
| Auth | POST | `/auth/login` | Login |
| Auth | GET  | `/auth/google` | Start Google OAuth |
| Auth | GET  | `/auth/microsoft` | Start Microsoft OAuth |
| Email | GET  | `/gmail/accounts` | List connected email accounts |
| Email | GET  | `/gmail/connect?provider=gmail\|outlook` | Connect account |
| Email | POST | `/gmail/sync/<account_id>` | Manual sync |
| Email | DELETE | `/gmail/accounts/<account_id>` | Disconnect account |
| Apps | GET  | `/applications/<user_id>` | List applications |
| Apps | POST | `/applications` | Create application |
| Apps | PATCH | `/applications/<id>` | Update application |
| Apps | DELETE | `/applications/<id>` | Delete application |

---

## How It Works

1. **Sign in** — Email/password or Google/Microsoft OAuth.
2. **Connect email** — Link Gmail or Outlook; the app gets permission to read mail.
3. **Sync & parse** — The backend fetches emails and uses OpenAI to detect job-related messages and extract company, role, location, and status.
4. **Dashboard** — Applications show up on the dashboard; you can filter, search, and edit.
5. **Background sync** — A scheduler runs every 30 minutes to pull new emails and update applications.

---

## Development

**Migrations (backend):**

```bash
cd backend
flask db migrate -m "Description"
flask db upgrade
```

**Frontend build:**

```bash
cd Frontend
npm run build
```

---

## License

This project is private and proprietary.

For questions or access, contact the repository owner.
