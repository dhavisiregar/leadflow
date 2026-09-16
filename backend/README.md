# LeadFlow — Backend

Go + Echo + GORM REST API for the LeadFlow Sales Pipeline Tracker.

## Stack

- **Go** — see `go.mod`
- **Echo v4** — HTTP framework
- **GORM** — ORM with PostgreSQL driver
- **golang-jwt/jwt** — JWT auth
- **bcrypt** — password hashing

## Quick Start

### 1. Prerequisites

- Go 1.23+
- PostgreSQL 12+

### 2. Clone & setup

```bash
git clone https://github.com/dhavisiregar/leadflow.git
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

GORM auto-migrates all tables on startup, then a one-time, idempotent migration seeds/upgrades every tenant's pipeline to the BRD's 6 stages (`internal/config/migrate_brd.go`) — safe to run against an existing database, it never drops leads.

### 5. Test the API

```bash
# Register (creates tenant + Owner + the 6 BRD pipeline stages)
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Dhavi","email":"dhavi@example.com","password":"secret123","tenant_name":"My Company"}'

# Login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dhavi@example.com","password":"secret123"}'

TOKEN="eyJ..."

# Create a lead (Company, Project name, New/Existing, Source)
curl -X POST http://localhost:8080/api/v1/leads \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"company":"PT Maju Jaya","title":"Website redesign","lead_type":"new","source":"Referral","stage_id":1}'

# Role-scoped analytics (Owner/Unit Head/Manager/Data Analyst only)
curl http://localhost:8080/api/v1/dashboard/analytics \
  -H "Authorization: Bearer $TOKEN"
```

## Project Structure

```
backend/
├── cmd/server/main.go          # Entrypoint, Echo setup, all routes
├── internal/
│   ├── config/
│   │   ├── config.go           # Env vars loader
│   │   ├── database.go         # GORM connection + AutoMigrate
│   │   └── migrate_brd.go      # One-time BRD stage-set migration
│   ├── handler/
│   │   ├── auth.go             # /auth/register, /auth/login, /auth/google, /auth/me
│   │   ├── lead.go             # Lead CRUD, /stage, /status
│   │   ├── lead_service.go     # Products & services line items
│   │   ├── activity.go         # Notes & updates
│   │   ├── stage.go            # GET /stages
│   │   ├── team.go             # Team CRUD (Unit Head + Manager + Sales members)
│   │   ├── team_member.go      # User account CRUD (Owner only)
│   │   └── dashboard.go        # GET /dashboard/analytics
│   ├── middleware/
│   │   └── jwt.go              # JWT validation, tenant scoping, role-based lead scoping
│   └── model/
│       └── model.go            # All GORM models
├── .env.example
├── Dockerfile
└── go.mod
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/v1/auth/register | ❌ | Register tenant + Owner |
| POST | /api/v1/auth/login | ❌ | Login, get JWT |
| POST | /api/v1/auth/google | ❌ | Sign in with a Google ID token |
| GET | /api/v1/auth/me | ✅ | Current user info |
| GET | /api/v1/stages | ✅ | List the tenant's pipeline stages |
| GET | /api/v1/leads | ✅ | List leads, scoped to the caller's role |
| POST | /api/v1/leads | ✅ | Create lead (Owner/Sales) |
| GET | /api/v1/leads/:id | ✅ | Get a single lead |
| PUT | /api/v1/leads/:id | ✅ | Update lead (Owner/Sales) |
| DELETE | /api/v1/leads/:id | ✅ | Delete lead (Owner/Sales) |
| PATCH | /api/v1/leads/:id/stage | ✅ | Move lead to a different pipeline stage |
| PATCH | /api/v1/leads/:id/status | ✅ | Active/On Hold/Won/Lost (reason required for Won/Lost) |
| POST | /api/v1/leads/:id/services | ✅ | Add a product/service line item |
| DELETE | /api/v1/leads/:id/services/:service_id | ✅ | Remove a line item |
| GET | /api/v1/leads/:id/activities | ✅ | List a lead's notes |
| POST | /api/v1/leads/:id/activities | ✅ | Add a note |
| PUT | /api/v1/leads/:id/activities/:activity_id | ✅ | Edit a note (author only) |
| DELETE | /api/v1/leads/:id/activities/:activity_id | ✅ | Delete a note (author only) |
| GET/POST | /api/v1/teams | ✅ (Owner) | List/create teams |
| PUT/DELETE | /api/v1/teams/:id | ✅ (Owner) | Update/delete a team |
| GET/POST | /api/v1/team-members | ✅ (Owner) | List/create user accounts |
| PUT/DELETE | /api/v1/team-members/:id | ✅ (Owner) | Update/remove a user account |
| GET | /api/v1/dashboard/analytics | ✅ (not Sales) | Role-scoped analytics with sales/team/status/date filters |

## Roles & Scoping

`Owner`, `Sales`, `Unit Head`, `Manager`, `Data Analyst` — see the root [README](../README.md#user-roles) for what each can do. Every lead-related query is scoped server-side in `internal/middleware/jwt.go` (`ScopeLeadsByRole`), not just hidden in the UI.

## Multi-tenancy

Every request to a protected route injects `tenant_id` from the JWT. All handlers scope queries to that tenant — no cross-tenant data leakage.
