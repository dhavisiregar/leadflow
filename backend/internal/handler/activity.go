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

// PUT /api/v1/leads/:id/activities/:activity_id
func (h *ActivityHandler) Update(c echo.Context) error {
	userID := c.Get("user_id").(uint)
	leadID, _ := strconv.Atoi(c.Param("id"))
	activityID, _ := strconv.Atoi(c.Param("activity_id"))

	var activity model.Activity
	if err := h.DB.Where("id = ? AND lead_id = ?", activityID, leadID).First(&activity).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "activity not found")
	}

	// Only creator can edit
	if activity.CreatedByID != userID {
		return echo.NewHTTPError(http.StatusForbidden, "cannot edit other users' activities")
	}

	var update model.Activity
	if err := c.Bind(&update); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	if update.Type != "" {
		activity.Type = update.Type
	}
	if update.Note != "" {
		activity.Note = update.Note
	}

	if err := h.DB.Save(&activity).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to update activity")
	}

	return c.JSON(http.StatusOK, activity)
}

// DELETE /api/v1/leads/:id/activities/:activity_id
func (h *ActivityHandler) Delete(c echo.Context) error {
	userID := c.Get("user_id").(uint)
	leadID, _ := strconv.Atoi(c.Param("id"))
	activityID, _ := strconv.Atoi(c.Param("activity_id"))

	var activity model.Activity
	if err := h.DB.Where("id = ? AND lead_id = ?", activityID, leadID).First(&activity).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "activity not found")
	}

	// Only creator can delete
	if activity.CreatedByID != userID {
		return echo.NewHTTPError(http.StatusForbidden, "cannot delete other users' activities")
	}

	if err := h.DB.Delete(&activity).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to delete activity")
	}

	return c.NoContent(http.StatusNoContent)
}
