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
	RoleOwner       Role = "owner"
	RoleMember      Role = "member"
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
	Role      Role           `gorm:"default:'member'" json:"role"`
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

// ── Contact ───────────────────────────────────────────────────────────────────

type Contact struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	TenantID  uint           `gorm:"not null;index;index:idx_contacts_tenant_name,priority:1;index:idx_contacts_tenant_email,priority:1" json:"tenant_id"`
	Name      string         `gorm:"not null;index:idx_contacts_tenant_name,priority:2" json:"name"`
	Email     string         `gorm:"index:idx_contacts_tenant_email,priority:2" json:"email"`
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
	TenantID       uint           `gorm:"not null;index;index:idx_leads_tenant_title,priority:1" json:"tenant_id"`
	ContactID      *uint          `json:"contact_id"`
	Contact        *Contact       `gorm:"foreignKey:ContactID" json:"contact,omitempty"`
	StageID        uint           `gorm:"not null" json:"stage_id"`
	Stage          *Stage         `gorm:"foreignKey:StageID" json:"stage,omitempty"`
	OwnerID        uint           `gorm:"not null" json:"owner_id"`
	Owner          *User          `gorm:"foreignKey:OwnerID" json:"owner,omitempty"`
	Title          string         `gorm:"not null;index:idx_leads_tenant_title,priority:2" json:"title"`
	Company        string         `json:"company"`
	LeadType       string         `gorm:"default:'new'" json:"lead_type"` // "new" | "existing"
	Source         string         `json:"source"`
	Status         LeadStatus     `gorm:"default:'active';index" json:"status"`
	Value          float64        `gorm:"default:0" json:"value"`
	Services       []LeadService  `gorm:"foreignKey:LeadID" json:"services,omitempty"`
	Notes          string         `json:"notes"`
	CloseReason    string         `json:"close_reason"`
	CloseNote      string         `json:"close_note"`
	LastActivityAt *time.Time     `json:"last_activity_at"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

// ── Lead Service (Products & Services line items) ───────────────────────────────

// LeadService is one product/service line item on a lead; the sum of all of a
// lead's services is kept in sync with Lead.Value once any exist.
type LeadService struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	LeadID    uint      `gorm:"not null;index" json:"lead_id"`
	Name      string    `gorm:"not null" json:"name"`
	Value     float64   `gorm:"default:0" json:"value"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ── Task ──────────────────────────────────────────────────────────────────────

type Task struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	TenantID    uint           `gorm:"not null;index;index:idx_tasks_tenant_title,priority:1" json:"tenant_id"`
	LeadID      *uint          `json:"lead_id"`
	Lead        *Lead          `gorm:"foreignKey:LeadID" json:"lead,omitempty"`
	OwnerID     uint           `gorm:"not null" json:"owner_id"`
	Owner       *User          `gorm:"foreignKey:OwnerID" json:"owner,omitempty"`
	Title       string         `gorm:"not null;index:idx_tasks_tenant_title,priority:2" json:"title"`
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

// ── Notification ──────────────────────────────────────────────────────────────

type NotificationType string

const (
	NotifTaskDue     NotificationType = "task_due"
	NotifTaskOverdue NotificationType = "task_overdue"
	NotifLeadStale   NotificationType = "lead_stale"
)

type Notification struct {
	ID                uint             `gorm:"primaryKey" json:"id"`
	TenantID          uint             `gorm:"not null;index:idx_notifications_tenant_user,priority:1" json:"tenant_id"`
	UserID            uint             `gorm:"not null;index:idx_notifications_tenant_user,priority:2" json:"user_id"`
	Type              NotificationType `gorm:"not null" json:"type"`
	Title             string           `gorm:"not null" json:"title"`
	Message           string           `json:"message"`
	IsRead            bool             `gorm:"not null;default:false;index:idx_notifications_tenant_user,priority:3" json:"is_read"`
	RelatedEntityType string           `json:"related_entity_type"`
	RelatedEntityID   *uint            `json:"related_entity_id"`
	CreatedAt         time.Time        `json:"created_at"`
}
