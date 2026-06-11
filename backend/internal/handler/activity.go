package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/dhavi/leadflow/internal/model"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type ActivityHandler struct {
	DB *gorm.DB
}

// GET /api/v1/leads/:id/activities
func (h *ActivityHandler) List(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)
	leadID, _ := strconv.Atoi(c.Param("id"))

	// Verify lead belongs to tenant
	var lead model.Lead
	if err := h.DB.Where("id = ? AND tenant_id = ?", leadID, tenantID).First(&lead).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "lead not found")
	}

	var activities []model.Activity
	if err := h.DB.Where("lead_id = ?", leadID).
		Preload("CreatedBy").
		Order("created_at desc").
		Find(&activities).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to fetch activities")
	}
	return c.JSON(http.StatusOK, activities)
}

// POST /api/v1/leads/:id/activities
func (h *ActivityHandler) Create(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)
	userID := c.Get("user_id").(uint)
	leadID, _ := strconv.Atoi(c.Param("id"))

	// Verify lead belongs to tenant
	var lead model.Lead
	if err := h.DB.Where("id = ? AND tenant_id = ?", leadID, tenantID).First(&lead).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "lead not found")
	}

	var activity model.Activity
	if err := c.Bind(&activity); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}
	activity.LeadID = uint(leadID)
	activity.CreatedByID = userID

	if err := h.DB.Create(&activity).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to create activity")
	}

	now := time.Now()
	h.DB.Model(&model.Lead{}).Where("id = ?", leadID).Update("last_activity_at", now)

	return c.JSON(http.StatusCreated, activity)
}
