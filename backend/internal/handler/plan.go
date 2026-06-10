package handler

import (
	"net/http"

	"github.com/dhavi/leadflow/internal/model"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type PlanHandler struct {
	DB *gorm.DB
}

var planOrder = map[model.Plan]int{
	model.PlanFree:    0,
	model.PlanStarter: 1,
	model.PlanPro:     2,
	model.PlanTeam:    3,
}

// GET /api/v1/plan
func (h *PlanHandler) Get(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)

	var tenant model.Tenant
	if err := h.DB.First(&tenant, tenantID).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "tenant not found")
	}

	limits := model.Limits[tenant.Plan]

	return c.JSON(http.StatusOK, echo.Map{
		"plan":        tenant.Plan,
		"leads_count": tenant.LeadsCount,
		"limits":      limits,
		"prices": echo.Map{
			"free":    0,
			"starter": 99000,
			"pro":     249000,
			"team":    599000,
		},
	})
}

// POST /api/v1/plan/downgrade
func (h *PlanHandler) Downgrade(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)

	var body struct {
		Plan string `json:"plan"`
	}
	if err := c.Bind(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	targetPlan := model.Plan(body.Plan)
	if _, ok := planOrder[targetPlan]; !ok {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid plan")
	}

	var tenant model.Tenant
	if err := h.DB.First(&tenant, tenantID).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "tenant not found")
	}

	if planOrder[targetPlan] >= planOrder[tenant.Plan] {
		return echo.NewHTTPError(http.StatusBadRequest, "target plan is not a downgrade")
	}

	// Warn if leads exceed new plan limit
	newLimits := model.Limits[targetPlan]
	if newLimits.MaxLeads != -1 && tenant.LeadsCount > newLimits.MaxLeads {
		return echo.NewHTTPError(http.StatusConflict, map[string]interface{}{
			"message":    "leads exceed new plan limit",
			"leads":      tenant.LeadsCount,
			"plan_limit": newLimits.MaxLeads,
		})
	}

	if err := h.DB.Model(&tenant).Update("plan", targetPlan).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to downgrade plan")
	}

	return c.JSON(http.StatusOK, echo.Map{"message": "plan downgraded", "plan": targetPlan})
}
