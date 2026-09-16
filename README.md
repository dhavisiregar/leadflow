# LeadFlow — Sales Pipeline Tracker

A sales pipeline tracker built to a Business Requirements Document (BRD): a 6-stage pipeline, role-based access for Sales/Unit Head/Manager/Data Analyst, and read-only analytics dashboards for the managerial roles.

## Features

### My Pipeline (Sales)

- 📌 **Kanban Board & Table view** — Board shows only Active leads per stage; Table supports every status (Active/On Hold/Won/Lost)
- ➕ **Quick lead creation** — Company, Project name, New/Existing, Source of lead; status defaults to Active, stage defaults to Initial Meeting
- 💰 **Products & Services** — Deal value is always the sum of a lead's service line items; the section unlocks once a lead reaches the Quotation stage
- 📝 **Notes & updates** — Timestamped, permanent activity history on every lead
- 🔍 **Search & filter** — By company/project/service name, and by status
- Sales only ever sees and manages their own leads — enforced both in the UI and on every API route

### Dashboard (Unit Head / Manager / Data Analyst)

- 📊 **Read-only analytics** — active lead count, active deal value, won value, lost count
- 👥 **Breakdown by sales rep and by team**
- 🎚️ **Filters** — sales rep, team, status, date range
- Scope is enforced server-side per role: Unit Head sees their team, Manager sees every team they oversee, Data Analyst sees the whole tenant — none of them can create or edit a lead

### Team Members (Owner)

- Create Sales / Unit Head / Manager / Data Analyst accounts directly
- Group Sales reps into Teams, each with one Unit Head and one Manager

### User Experience

- 🌙 **Dark mode** — full dark/light theme support with system preference detection
- 📱 **Responsive design**
- 🔑 **Continue with Google** — sign in with Google Identity Services; first-time users are auto-provisioned a tenant/owner account

## User Roles

| Role | Access |
|---|---|
| **Sales** | Create/manage their own leads, add notes, search/filter their own pipeline. Cannot see other reps' leads or the Dashboard. |
| **Unit Head** | Read-only Dashboard scoped to the Sales reps on their team. |
| **Manager** | Read-only Dashboard scoped to every team they oversee. |
| **Data Analyst** | Read-only Dashboard across the whole tenant. |
| **Owner** | Full access to Pipeline (all leads) plus Team Members administration. Bootstraps the account via Register. |

## Pipeline Stages

`Initial Meeting → Requirement, Assessment, POC → Quotation → Negotiation → PO → Invoiced`

A lead's **Status** (Active / On Hold / Won / Lost) is tracked separately from its stage. Marking a lead Won or Lost requires a reason and removes it from the Board (it stays visible, and editable, in the Table view).

## Tech Stack

### Backend

- **Language**: Go
- **Framework**: Echo v4
- **Database**: PostgreSQL
- **ORM**: GORM
- **Authentication**: JWT (multi-tenant), Google Identity Services (ID token verified against Google's JWKS)

### Frontend

- **Library**: React
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: Lucide Icons
- **HTTP Client**: Axios
- **Drag & Drop**: @hello-pangea/dnd
- **Router**: React Router v6

## Getting Started

### Prerequisites

- Go 1.23+
- Node.js 18+
- PostgreSQL 12+

### Local Development

#### Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your database credentials
go run ./cmd/server
```

Backend runs on `http://localhost:8080/api/v1`

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

### Environment Variables

**Backend** (`.env`):

```
APP_PORT=8080
APP_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=leadflow
DB_SSLMODE=disable
JWT_SECRET=your-random-secret-key
JWT_EXPIRES_HOURS=72
GOOGLE_CLIENT_ID=your-google-oauth-client-id
ALLOWED_ORIGINS=http://localhost:5173
```

**Frontend** (`.env`):

```
VITE_API_URL=http://localhost:8080/api/v1
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

## Project Structure

```
leadflow/
├── backend/
│   ├── cmd/server/          # Application entry point
│   ├── internal/
│   │   ├── config/          # Env vars, DB connection, BRD stage-migration
│   │   ├── handler/         # HTTP request handlers
│   │   ├── middleware/      # JWT auth, tenant scoping, role-based lead scoping
│   │   └── model/           # Database models
│   └── Dockerfile           # Docker build config
│
└── frontend/
    ├── src/
    │   ├── api/             # API client functions
    │   ├── components/      # Reusable components (ConfirmModal)
    │   ├── context/         # React Context (Auth, Theme)
    │   ├── pages/            # Pipeline, Analytics (Dashboard), TeamMembers, Login, Register
    │   └── index.css        # Global styles & Tailwind
    └── vite.config.js       # Vite configuration
```

## API Documentation

### Authentication

- `POST /auth/register` — Register new account (creates tenant + Owner)
- `POST /auth/login` — Login and get JWT token
- `POST /auth/google` — Sign in with a Google ID token (auto-provisions a tenant/owner account for first-time users)
- `GET /auth/me` — Get current user profile

### Leads

- `GET /leads` — List leads, scoped to the caller's role
- `POST /leads` — Create lead (Owner/Sales)
- `GET /leads/:id` — Get a single lead
- `PUT /leads/:id` — Update lead (Owner/Sales)
- `DELETE /leads/:id` — Delete lead (Owner/Sales)
- `PATCH /leads/:id/stage` — Move a lead to a different pipeline stage
- `PATCH /leads/:id/status` — Change Active/On Hold/Won/Lost (reason required for Won/Lost)
- `POST /leads/:id/services` — Add a product/service line item (recomputes deal value)
- `DELETE /leads/:id/services/:service_id` — Remove a line item

### Notes & Updates

- `GET /leads/:id/activities` — List a lead's notes
- `POST /leads/:id/activities` — Add a note
- `PUT /leads/:id/activities/:activity_id` — Edit a note (author only)
- `DELETE /leads/:id/activities/:activity_id` — Delete a note (author only)

### Teams & Team Members (Owner only)

- `GET/POST /teams`, `PUT/DELETE /teams/:id` — Manage teams (Unit Head + Manager + Sales members)
- `GET/POST /team-members`, `PUT/DELETE /team-members/:id` — Manage user accounts and roles

### Dashboard

- `GET /dashboard/analytics` — Role-scoped analytics with `sales_id`, `team_id`, `status`, `date_from`, `date_to` filters

## Deployment

### Backend (Render)

1. Push code to GitHub
2. Create Web Service on Render from repo
3. Set Root Directory to `backend`
4. Add environment variables
5. Deploy (Render auto-builds from Dockerfile)

### Frontend (Vercel)

1. Import project on Vercel
2. Set Root Directory to `frontend`
3. Add `VITE_API_URL` environment variable
4. Deploy (auto-rebuilds on push)

### Database (Neon)

1. Create PostgreSQL database on Neon
2. Use connection string for `DB_*` env vars
3. Set `DB_SSLMODE=require` for SSL connections
