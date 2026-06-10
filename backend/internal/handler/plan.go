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

// GET /api/v1/plan
func (h *PlanHandler) Get(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)

	var tenant model.Tenant
	if err := h.DB.First(&tenant, tenantID).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "tenant not found")
	}

	limits := model.Limits[tenant.Plan]

	return c.JSON(http.StatusOK, echo.Map{
		"plan":         tenant.Plan,
		"leads_count":  tenant.LeadsCount,
		"limits":       limits,
		"prices": echo.Map{
			"free":    0,
			"starter": 99000,
			"pro":     249000,
			"team":    599000,
		},
	})
}
