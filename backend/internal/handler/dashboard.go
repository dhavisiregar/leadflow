package handler

import (
	"net/http"

	mw "github.com/dhavi/leadflow/internal/middleware"
	"github.com/dhavi/leadflow/internal/model"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type DashboardHandler struct {
	DB *gorm.DB
}

// GET /api/v1/dashboard/analytics
// Read-only, role-scoped analytics for Unit Head / Manager / Data Analyst /
// Owner, with breakdowns per sales rep and per team, per the BRD.
func (h *DashboardHandler) Analytics(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)
	role := c.Get("role").(model.Role)
	userID := c.Get("user_id").(uint)

	if role == model.RoleSales {
		return echo.NewHTTPError(http.StatusForbidden, "analytics dashboard is not available for your role")
	}

	salesID := c.QueryParam("sales_id")
	teamID := c.QueryParam("team_id")
	status := c.QueryParam("status")
	dateFrom := c.QueryParam("date_from")
	dateTo := c.QueryParam("date_to")

	newBase := func() *gorm.DB {
		q := mw.ScopeLeadsByRole(h.DB.Model(&model.Lead{}).Where("leads.tenant_id = ?", tenantID), role, userID)
		if salesID != "" {
			q = q.Where("leads.owner_id = ?", salesID)
		}
		if teamID != "" {
			q = q.Where("leads.owner_id IN (SELECT id FROM users WHERE team_id = ?)", teamID)
		}
		if status != "" {
			q = q.Where("leads.status = ?", status)
		}
		if dateFrom != "" {
			q = q.Where("leads.created_at >= ?", dateFrom)
		}
		if dateTo != "" {
			q = q.Where("leads.created_at <= ?", dateTo)
		}
		return q
	}

	var activeLeadCount, lostCount int64
	var activeDealValue, wonValue float64
	newBase().Where("leads.status = ?", model.LeadStatusActive).Count(&activeLeadCount)
	newBase().Where("leads.status = ?", model.LeadStatusActive).
		Select("COALESCE(SUM(leads.value), 0)").Scan(&activeDealValue)
	newBase().Where("leads.status = ?", model.LeadStatusWon).
		Select("COALESCE(SUM(leads.value), 0)").Scan(&wonValue)
	newBase().Where("leads.status = ?", model.LeadStatusLost).Count(&lostCount)

	type RepBreakdown struct {
		UserID      uint    `json:"user_id"`
		Name        string  `json:"name"`
		ActiveCount int64   `json:"active_count"`
		ActiveValue float64 `json:"active_value"`
		WonValue    float64 `json:"won_value"`
		LostCount   int64   `json:"lost_count"`
	}
	var bySalesRep []RepBreakdown
	newBase().
		Select(`leads.owner_id as user_id, users.name as name,
			COUNT(*) FILTER (WHERE leads.status = 'active') as active_count,
			COALESCE(SUM(leads.value) FILTER (WHERE leads.status = 'active'), 0) as active_value,
			COALESCE(SUM(leads.value) FILTER (WHERE leads.status = 'won'), 0) as won_value,
			COUNT(*) FILTER (WHERE leads.status = 'lost') as lost_count`).
		Joins("JOIN users ON users.id = leads.owner_id").
		Group("leads.owner_id, users.name").
		Order("users.name").
		Scan(&bySalesRep)

	type TeamBreakdown struct {
		TeamID      uint    `json:"team_id"`
		TeamName    string  `json:"team_name"`
		ActiveCount int64   `json:"active_count"`
		ActiveValue float64 `json:"active_value"`
		WonValue    float64 `json:"won_value"`
		LostCount   int64   `json:"lost_count"`
	}
	var byTeam []TeamBreakdown
	newBase().
		Select(`teams.id as team_id, teams.name as team_name,
			COUNT(*) FILTER (WHERE leads.status = 'active') as active_count,
			COALESCE(SUM(leads.value) FILTER (WHERE leads.status = 'active'), 0) as active_value,
			COALESCE(SUM(leads.value) FILTER (WHERE leads.status = 'won'), 0) as won_value,
			COUNT(*) FILTER (WHERE leads.status = 'lost') as lost_count`).
		Joins("JOIN users ON users.id = leads.owner_id").
		Joins("JOIN teams ON teams.id = users.team_id").
		Group("teams.id, teams.name").
		Order("teams.name").
		Scan(&byTeam)

	type Option struct {
		ID   uint   `json:"id"`
		Name string `json:"name"`
	}
	var scopeSalesReps []Option
	newBase().Distinct("leads.owner_id as id, users.name as name").
		Joins("JOIN users ON users.id = leads.owner_id").
		Order("name").Scan(&scopeSalesReps)

	var scopeTeams []Option
	newBase().Distinct("teams.id as id, teams.name as name").
		Joins("JOIN users ON users.id = leads.owner_id").
		Joins("JOIN teams ON teams.id = users.team_id").
		Order("name").Scan(&scopeTeams)

	return c.JSON(http.StatusOK, echo.Map{
		"active_lead_count": activeLeadCount,
		"active_deal_value": activeDealValue,
		"won_value":         wonValue,
		"lost_count":        lostCount,
		"by_sales_rep":      bySalesRep,
		"by_team":           byTeam,
		"scope_sales_reps":  scopeSalesReps,
		"scope_teams":       scopeTeams,
	})
}
