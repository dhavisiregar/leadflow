package model

import (
	"time"

	"gorm.io/gorm"
)

// ── Tenant ────────────────────────────────────────────────────────────────────

type Tenant struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Name      string         `gorm:"not null" json:"name"`
	Slug      string         `gorm:"uniqueIndex;not null" json:"slug"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// ── User ──────────────────────────────────────────────────────────────────────

// Role is the BRD's four-tier org hierarchy (Sales/Unit Head/Manager/Data
// Analyst), plus Owner — the tenant's admin, who bootstraps the account and
// manages Team Members.
type Role string

const (
	RoleOwner       Role = "owner"
	RoleSales       Role = "sales"
	RoleUnitHead    Role = "unit_head"
	RoleManager     Role = "manager"
	RoleDataAnalyst Role = "data_analyst"
)

type User struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	TenantID  uint           `gorm:"not null;index" json:"tenant_id"`
	Tenant    Tenant         `gorm:"foreignKey:TenantID" json:"-"`
	Name      string         `gorm:"not null" json:"name"`
	Email     string         `gorm:"uniqueIndex;not null" json:"email"`
	Password  string         `gorm:"not null" json:"-"`
	Role      Role           `gorm:"default:'sales'" json:"role"`
	TeamID    *uint          `json:"team_id"`
	Team      *Team          `gorm:"foreignKey:TeamID;constraint:-" json:"team,omitempty"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// ── Team ──────────────────────────────────────────────────────────────────────

// Team groups Sales reps under a Unit Head, with a Manager overseeing one or
// more teams. Sales users are assigned via User.TeamID; Unit Head/Manager are
// looked up in reverse via Team.UnitHeadID/ManagerID.
type Team struct {
	ID         uint           `gorm:"primaryKey" json:"id"`
	TenantID   uint           `gorm:"not null;index" json:"tenant_id"`
	Name       string         `gorm:"not null" json:"name"`
	ManagerID  *uint          `json:"manager_id"`
	Manager    *User          `gorm:"foreignKey:ManagerID;constraint:-" json:"manager,omitempty"`
	UnitHeadID *uint          `json:"unit_head_id"`
	UnitHead   *User          `gorm:"foreignKey:UnitHeadID;constraint:-" json:"unit_head,omitempty"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

// ── Stage ─────────────────────────────────────────────────────────────────────

type Stage struct {
	ID       uint   `gorm:"primaryKey" json:"id"`
	TenantID uint   `gorm:"not null;index" json:"tenant_id"`
	Name     string `gorm:"not null" json:"name"`
	Order    int    `gorm:"default:0" json:"order"`
	Color    string `gorm:"default:'#718096'" json:"color"`
}

// ── Lead ──────────────────────────────────────────────────────────────────────

// LeadStatus tracks the BRD's Active/On Hold/Won/Lost state, independent of
// which of the 6 pipeline stages the lead currently sits in.
type LeadStatus string

const (
	LeadStatusActive LeadStatus = "active"
	LeadStatusOnHold LeadStatus = "on_hold"
	LeadStatusWon    LeadStatus = "won"
	LeadStatusLost   LeadStatus = "lost"
)

type Lead struct {
	ID             uint           `gorm:"primaryKey" json:"id"`
	TenantID       uint           `gorm:"not null;index" json:"tenant_id"`
	StageID        uint           `gorm:"not null" json:"stage_id"`
	Stage          *Stage         `gorm:"foreignKey:StageID" json:"stage,omitempty"`
	OwnerID        uint           `gorm:"not null" json:"owner_id"`
	Owner          *User          `gorm:"foreignKey:OwnerID" json:"owner,omitempty"`
	Company        string         `gorm:"not null" json:"company"`
	Title          string         `gorm:"not null" json:"title"`          // Project name
	LeadType       string         `gorm:"default:'new'" json:"lead_type"` // "new" | "existing"
	Source         string         `json:"source"`
	Status         LeadStatus     `gorm:"default:'active';index" json:"status"`
	Value          float64        `gorm:"default:0" json:"value"`
	Services       []LeadService  `gorm:"foreignKey:LeadID" json:"services,omitempty"`
	CloseReason    string         `json:"close_reason"`
	CloseNote      string         `json:"close_note"`
	LastActivityAt *time.Time     `json:"last_activity_at"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

// ── Lead Service (Products & Services line items) ───────────────────────────────

// LeadService is one product/service line item on a lead; the sum of all of a
// lead's services is kept in sync with Lead.Value.
type LeadService struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	LeadID    uint      `gorm:"not null;index" json:"lead_id"`
	Name      string    `gorm:"not null" json:"name"`
	Value     float64   `gorm:"default:0" json:"value"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ── Activity (Notes & updates) ───────────────────────────────────────────────

// Activity is one timestamped entry in a lead's "Notes & updates" history.
type Activity struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	LeadID      uint      `gorm:"not null;index" json:"lead_id"`
	CreatedByID uint      `gorm:"not null" json:"created_by_id"`
	CreatedBy   *User     `gorm:"foreignKey:CreatedByID" json:"created_by,omitempty"`
	Note        string    `json:"note"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
