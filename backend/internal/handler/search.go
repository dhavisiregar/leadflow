package handler

import (
	"net/http"
	"strings"
	"time"

	"github.com/dhavi/leadflow/internal/model"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type SearchHandler struct {
	DB *gorm.DB
}

const searchResultLimit = 8

type searchLeadResult struct {
	ID    uint         `json:"id"`
	Title string       `json:"title"`
	Value float64      `json:"value"`
	Stage *model.Stage `json:"stage,omitempty"`
}

type searchContactResult struct {
	ID      uint   `json:"id"`
	Name    string `json:"name"`
	Email   string `json:"email"`
	Company string `json:"company"`
}

type searchTaskResult struct {
	ID          uint       `json:"id"`
	Title       string     `json:"title"`
	IsCompleted bool       `json:"is_completed"`
	DueDate     *time.Time `json:"due_date"`
}

// GET /api/v1/search?q=...
// Searches leads (title), contacts (name, email), and tasks (title) —
// tenant-scoped and capped to a handful of results per type for a topbar
// dropdown. Every query filters on the tenant_id index first (see the
// idx_*_tenant_* composite indexes in model.go), so it never scans another
// tenant's rows regardless of how many tenants share the leads/contacts/
// tasks tables.
func (h *SearchHandler) Search(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)
	q := strings.TrimSpace(c.QueryParam("q"))

	empty := echo.Map{
		"leads":    []searchLeadResult{},
		"contacts": []searchContactResult{},
		"tasks":    []searchTaskResult{},
	}
	if len(q) < 2 {
		return c.JSON(http.StatusOK, empty)
	}
	like := "%" + q + "%"

	var leads []model.Lead
	h.DB.Where("tenant_id = ? AND title ILIKE ?", tenantID, like).
		Preload("Stage").Order("created_at desc").Limit(searchResultLimit).Find(&leads)
	leadResults := make([]searchLeadResult, 0, len(leads))
	for _, l := range leads {
		leadResults = append(leadResults, searchLeadResult{ID: l.ID, Title: l.Title, Value: l.Value, Stage: l.Stage})
	}

	var contacts []model.Contact
	h.DB.Where("tenant_id = ? AND (name ILIKE ? OR email ILIKE ?)", tenantID, like, like).
		Order("created_at desc").Limit(searchResultLimit).Find(&contacts)
	contactResults := make([]searchContactResult, 0, len(contacts))
	for _, ct := range contacts {
		contactResults = append(contactResults, searchContactResult{ID: ct.ID, Name: ct.Name, Email: ct.Email, Company: ct.Company})
	}

	var tasks []model.Task
	h.DB.Where("tenant_id = ? AND title ILIKE ?", tenantID, like).
		Order("created_at desc").Limit(searchResultLimit).Find(&tasks)
	taskResults := make([]searchTaskResult, 0, len(tasks))
	for _, t := range tasks {
		taskResults = append(taskResults, searchTaskResult{ID: t.ID, Title: t.Title, IsCompleted: t.IsCompleted, DueDate: t.DueDate})
	}

	return c.JSON(http.StatusOK, echo.Map{
		"leads":    leadResults,
		"contacts": contactResults,
		"tasks":    taskResults,
	})
}
