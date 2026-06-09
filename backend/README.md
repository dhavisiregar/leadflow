# LeadFlow CRM — Backend

Go + Echo + GORM REST API for the LeadFlow CRM SaaS.

## Stack

- **Go 1.22**
- **Echo v4** — HTTP framework
- **GORM** — ORM with PostgreSQL driver
- **golang-jwt/jwt** — JWT auth
- **bcrypt** — password hashing

## Quick Start

### 1. Prerequisites

- Go 1.22+
- PostgreSQL 15+

### 2. Clone & setup

```bash
git clone https://github.com/dhavi/leadflow.git
cd leadflow/backend

cp .env.example .env
# Edit .env with your DB credentials and a strong JWT_SECRET
```

### 3. Create database

```sql
CREATE DATABASE leadflow;
```

### 4. Run

```bash
go mod tidy
go run ./cmd/server
```

GORM will auto-migrate all tables on first run.

### 5. Test the API

```bash
# Register (creates tenant + owner + default stages)
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Dhavi","email":"dhavi@example.com","password":"secret123","tenant_name":"My Company"}'

# Login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dhavi@example.com","password":"secret123"}'

# Use the token from login for protected routes
TOKEN="eyJ..."

# Create a lead
curl -X POST http://localhost:8080/api/v1/leads \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Big Client Deal","value":5000000,"stage_id":1}'

# Get pipeline stats
curl http://localhost:8080/api/v1/dashboard/stats \
  -H "Authorization: Bearer $TOKEN"
```

## Project Structure

```
backend/
├── cmd/server/main.go          # Entrypoint, Echo setup, all routes
├── internal/
│   ├── config/
│   │   ├── config.go           # Env vars loader
│   │   └── database.go         # GORM connection + AutoMigrate
│   ├── handler/
│   │   ├── auth.go             # POST /auth/register, /auth/login, GET /auth/me
│   │   ├── lead.go             # CRUD + PATCH /leads/:id/stage
│   │   ├── contact.go          # CRUD contacts
│   │   ├── activity.go         # GET/POST /leads/:id/activities
│   │   └── dashboard.go        # GET /dashboard/stats
│   ├── middleware/
│   │   └── jwt.go              # JWT validation, tenant scoping, role guard
│   └── model/
│       └── model.go            # All GORM models
├── .env.example
├── Dockerfile
└── go.mod
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/v1/auth/register | ❌ | Register tenant + owner |
| POST | /api/v1/auth/login | ❌ | Login, get JWT |
| GET | /api/v1/auth/me | ✅ | Current user info |
| GET | /api/v1/leads | ✅ | List leads (filter by ?stage_id=) |
| POST | /api/v1/leads | ✅ | Create lead (enforces plan limit) |
| GET | /api/v1/leads/:id | ✅ | Get single lead |
| PUT | /api/v1/leads/:id | ✅ | Update lead |
| DELETE | /api/v1/leads/:id | ✅ | Soft delete lead |
| PATCH | /api/v1/leads/:id/stage | ✅ | Move lead to different stage |
| GET | /api/v1/leads/:id/activities | ✅ | List activities for a lead |
| POST | /api/v1/leads/:id/activities | ✅ | Log activity on a lead |
| GET | /api/v1/contacts | ✅ | List contacts |
| POST | /api/v1/contacts | ✅ | Create contact |
| GET | /api/v1/contacts/:id | ✅ | Get contact |
| PUT | /api/v1/contacts/:id | ✅ | Update contact |
| DELETE | /api/v1/contacts/:id | ✅ | Delete contact |
| GET | /api/v1/dashboard/stats | ✅ | Pipeline value, conversion rate, etc. |

## Multi-tenancy

Every request to a protected route injects `tenant_id` from the JWT. All handlers scope queries to that tenant — no cross-tenant data leakage.

## Next Steps

- [ ] React frontend (Vite + Tailwind)
- [ ] Stripe billing integration
- [ ] Email notifications (Resend)
- [ ] GitHub Actions CI/CD
- [ ] Deploy to Railway
