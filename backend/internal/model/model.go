package model

import (
	"time"

	"gorm.io/gorm"
)

// ── Tenant ────────────────────────────────────────────────────────────────────

type Plan string

const (
	PlanFree    Plan = "free"
	PlanStarter Plan = "starter"
	PlanPro     Plan = "pro"
	PlanTeam    Plan = "team"
)

type Tenant struct {
	ID         uint           `gorm:"primaryKey" json:"id"`
	Name       string         `gorm:"not null" json:"name"`
	Slug       string         `gorm:"uniqueIndex;not null" json:"slug"`
	Plan       Plan           `gorm:"default:'free'" json:"plan"`
	LeadsCount int            `gorm:"default:0" json:"leads_count"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

// ── User ──────────────────────────────────────────────────────────────────────

type Role string

const (
	RoleOwner  Role = "owner"
	RoleMember Role = "member"
)

type User struct {
	ID              uint           `gorm:"primaryKey" json:"id"`
	TenantID        uint           `gorm:"not null;index" json:"tenant_id"`
	Tenant          Tenant         `gorm:"foreignKey:TenantID" json:"-"`
	Name            string         `gorm:"not null" json:"name"`
	Email           string         `gorm:"uniqueIndex;not null" json:"email"`
	Password        string         `gorm:"not null" json:"-"`
	Role            Role           `gorm:"default:'member'" json:"role"`
	Status          string         `gorm:"default:'active'" json:"status"` // "active" | "pending"
	InviteToken     *string        `gorm:"uniqueIndex" json:"-"`
	InviteExpiresAt *time.Time     `json:"-"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}

// ── Contact ───────────────────────────────────────────────────────────────────

type Contact struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	TenantID  uint           `gorm:"not null;index" json:"tenant_id"`
	Name      string         `gorm:"not null" json:"name"`
	Email     string         `json:"email"`
	Phone     string         `json:"phone"`
	Company   string         `json:"company"`
	Notes     string         `json:"notes"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
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

type Lead struct {
	ID             uint           `gorm:"primaryKey" json:"id"`
	TenantID       uint           `gorm:"not null;index" json:"tenant_id"`
	ContactID      *uint          `json:"contact_id"`
	Contact        *Contact       `gorm:"foreignKey:ContactID" json:"contact,omitempty"`
	StageID        uint           `gorm:"not null" json:"stage_id"`
	Stage          *Stage         `gorm:"foreignKey:StageID" json:"stage,omitempty"`
	OwnerID        uint           `gorm:"not null" json:"owner_id"`
	Owner          *User          `gorm:"foreignKey:OwnerID" json:"owner,omitempty"`
	Title          string         `gorm:"not null" json:"title"`
	Value          float64        `gorm:"default:0" json:"value"`
	Notes          string         `json:"notes"`
	CloseReason    string         `json:"close_reason"`
	CloseNote      string         `json:"close_note"`
	LastActivityAt *time.Time     `json:"last_activity_at"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

// ── Task ──────────────────────────────────────────────────────────────────────

type Task struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	TenantID    uint           `gorm:"not null;index" json:"tenant_id"`
	LeadID      *uint          `json:"lead_id"`
	Lead        *Lead          `gorm:"foreignKey:LeadID" json:"lead,omitempty"`
	OwnerID     uint           `gorm:"not null" json:"owner_id"`
	Owner       *User          `gorm:"foreignKey:OwnerID" json:"owner,omitempty"`
	Title       string         `gorm:"not null" json:"title"`
	Priority    string         `gorm:"default:'medium'" json:"priority"`
	DueDate     *time.Time     `json:"due_date"`
	IsCompleted bool           `gorm:"default:false" json:"is_completed"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// ── Activity ──────────────────────────────────────────────────────────────────

type ActivityType string

const (
	ActivityCall    ActivityType = "call"
	ActivityEmail   ActivityType = "email"
	ActivityMeeting ActivityType = "meeting"
	ActivityNote    ActivityType = "note"
)

type Activity struct {
	ID          uint         `gorm:"primaryKey" json:"id"`
	LeadID      uint         `gorm:"not null;index" json:"lead_id"`
	CreatedByID uint         `gorm:"not null" json:"created_by_id"`
	CreatedBy   *User        `gorm:"foreignKey:CreatedByID" json:"created_by,omitempty"`
	Type        ActivityType `gorm:"not null" json:"type"`
	Note        string       `json:"note"`
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`
}
