package handler

import (
	"net/http"

	"github.com/dhavi/leadflow/internal/model"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type StageHandler struct {
	DB *gorm.DB
}

// GET /api/v1/stages
func (h *StageHandler) List(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)

	var stages []model.Stage
	if err := h.DB.Where("tenant_id = ?", tenantID).Order("\"order\" asc").Find(&stages).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to fetch stages")
	}

	return c.JSON(http.StatusOK, stages)
}
