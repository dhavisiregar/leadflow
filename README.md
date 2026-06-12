# LeadFlow CRM

A full-stack CRM application for managing leads, contacts, tasks, and sales pipelines with real-time collaboration features.

## Features

### Pipeline Management

- 📌 **Kanban Board** — Drag & drop leads across pipeline stages
- 🎯 **Lead Scoring** — Aging badges (green/yellow/red) based on last activity
- 💰 **Deal Values** — Track opportunity values and stage totals
- 📝 **Lead Details** — Comprehensive lead view with activities, notes, and contact info

### Task Management

- ✅ **Smart Tasks** — Priority levels (high/medium/low), due dates, overdue highlighting
- 🏷️ **Filter Tabs** — All/Today/Overdue/Completed tasks with count badges
- 👥 **Group by Lead** — Organize tasks by associated leads
- ⚡ **Quick Add** — Inline task creation and editing

### Contacts & Activities

- 👤 **Contact Management** — Store and organize contact information
- 📞 **Activity Logging** — Track calls, emails, meetings, and notes
- ✏️ **Activity Edit/Delete** — Update or remove logged activities with confirmation
- 👁️ **Activity History** — Complete audit trail with creator and timestamps

### Reports & Analytics

- 📊 **Pipeline Analytics** — Visual breakdown of leads by stage and value
- 📈 **Deal Progress** — Track conversion rates and pipeline health
- 💹 **Revenue Forecast** — Estimate revenue based on deal values

### Subscription & Billing

- 💳 **Flexible Plans** — Free/Starter/Pro/Team with different features
- 🔐 **Secure Payments** — Midtrans payment gateway integration
- 📊 **Usage Tracking** — Real-time lead count and plan limits

### User Experience

- 🌙 **Dark Mode** — Full dark/light theme support with system preference detection
- 📱 **Responsive Design** — Works seamlessly on desktop, tablet, and mobile
- ⌨️ **Keyboard Navigation** — Escape to cancel, Enter to submit
- 🎨 **Modern UI** — Tailwind CSS with smooth animations and transitions

## Tech Stack

### Backend

- **Language**: Go 1.23
- **Framework**: Echo v4
- **Database**: PostgreSQL
- **ORM**: GORM
- **Authentication**: JWT (multi-tenant)
- **Email**: Resend API
- **Payments**: Midtrans (sandbox/production)

### Frontend

- **Library**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: Lucide Icons
- **HTTP Client**: Axios
- **Drag & Drop**: @hello-pangea/dnd
- **Charts**: Recharts
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
MIDTRANS_SERVER_KEY=your-midtrans-key
MIDTRANS_CLIENT_KEY=your-midtrans-client-key
MIDTRANS_ENV=sandbox
RESEND_API_KEY=your-resend-api-key
ALERT_FROM_EMAIL=alerts@yourdomain.com
ALLOWED_ORIGINS=http://localhost:5173
```

**Frontend** (`.env`):

```
VITE_API_URL=http://localhost:8080/api/v1
```

## Project Structure

```
leadflow/
├── backend/
│   ├── cmd/server/          # Application entry point
│   ├── internal/
│   │   ├── config/          # Configuration management
│   │   ├── handler/         # HTTP request handlers
│   │   ├── middleware/      # JWT auth, logging
│   │   ├── model/           # Database models
│   │   └── job/             # Background jobs (stale lead alerts)
│   └── Dockerfile           # Docker build config
│
└── frontend/
    ├── src/
    │   ├── api/             # API client functions
    │   ├── components/      # Reusable components (ConfirmModal, UpgradePrompt)
    │   ├── context/         # React Context (Auth, Theme)
    │   ├── pages/           # Route pages (Pipeline, Tasks, Contacts, etc)
    │   └── index.css        # Global styles & Tailwind
    └── vite.config.js       # Vite configuration
```

## API Documentation

### Authentication

- `POST /auth/register` — Register new account
- `POST /auth/login` — Login and get JWT token
- `GET /auth/me` — Get current user profile

### Leads

- `GET /leads` — List leads (with filters)
- `POST /leads` — Create lead
- `PUT /leads/:id` — Update lead
- `DELETE /leads/:id` — Delete lead
- `PATCH /leads/:id/stage` — Move lead to different stage

### Activities

- `GET /leads/:id/activities` — List activities for a lead
- `POST /leads/:id/activities` — Log activity
- `PUT /leads/:id/activities/:activity_id` — Update activity
- `DELETE /leads/:id/activities/:activity_id` — Delete activity

### Tasks

- `GET /tasks` — List tasks (with filters: today, overdue, completed)
- `POST /tasks` — Create task
- `PUT /tasks/:id` — Update task
- `PATCH /tasks/:id/complete` — Mark task as complete
- `DELETE /tasks/:id` — Delete task

### Contacts

- `GET /contacts` — List contacts
- `POST /contacts` — Create contact
- `PUT /contacts/:id` — Update contact
- `DELETE /contacts/:id` — Delete contact

### Reports & Dashboard

- `GET /dashboard/stats` — Get dashboard statistics
- `GET /reports/summary` — Get reports summary (configurable time range)

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

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Author

[Sultan Muhammad Dhavi](https://github.com/dhavisiregar)
