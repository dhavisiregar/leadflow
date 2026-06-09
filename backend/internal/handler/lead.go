package handler

import (
	"net/http"
	"strconv"

	"github.com/dhavi/leadflow/internal/model"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type LeadHandler struct {
	DB *gorm.DB
}

const freePlanLeadLimit = 50

// GET /api/v1/leads
func (h *LeadHandler) List(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)

	var leads []model.Lead
	query := h.DB.Where("tenant_id = ?", tenantID).
		Preload("Contact").
		Preload("Stage").
		Preload("Owner")

	// Optional filter by stage
	if stageID := c.QueryParam("stage_id"); stageID != "" {
		query = query.Where("stage_id = ?", stageID)
	}

	if err := query.Find(&leads).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to fetch leads")
	}
	return c.JSON(http.StatusOK, leads)
}

// GET /api/v1/leads/:id
func (h *LeadHandler) Get(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)
	id, _ := strconv.Atoi(c.Param("id"))

	var lead model.Lead
	if err := h.DB.Where("id = ? AND tenant_id = ?", id, tenantID).
		Preload("Contact").Preload("Stage").Preload("Owner").
		First(&lead).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "lead not found")
	}
	return c.JSON(http.StatusOK, lead)
}

// POST /api/v1/leads
func (h *LeadHandler) Create(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)
	ownerID := c.Get("user_id").(uint)

	// Enforce free plan limit
	var tenant model.Tenant
	h.DB.First(&tenant, tenantID)
	if tenant.Plan == model.PlanFree && tenant.LeadsCount >= freePlanLeadLimit {
		return echo.NewHTTPError(http.StatusPaymentRequired, "free plan limit reached (50 leads). Please upgrade.")
	}

	var lead model.Lead
	if err := c.Bind(&lead); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	lead.TenantID = tenantID
	lead.OwnerID = ownerID

	if err := h.DB.Create(&lead).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to create lead")
	}

	// Increment tenant leads_count
	h.DB.Model(&tenant).UpdateColumn("leads_count", gorm.Expr("leads_count + 1"))

	return c.JSON(http.StatusCreated, lead)
}

// PUT /api/v1/leads/:id
func (h *LeadHandler) Update(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)
	id, _ := strconv.Atoi(c.Param("id"))

	var lead model.Lead
	if err := h.DB.Where("id = ? AND tenant_id = ?", id, tenantID).First(&lead).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "lead not found")
	}

	if err := c.Bind(&lead); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	// Protect immutable fields
	lead.ID = uint(id)
	lead.TenantID = tenantID

	if err := h.DB.Save(&lead).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to update lead")
	}
	return c.JSON(http.StatusOK, lead)
}

// PATCH /api/v1/leads/:id/stage
func (h *LeadHandler) MoveStage(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)
	id, _ := strconv.Atoi(c.Param("id"))

	var body struct {
		StageID uint `json:"stage_id"`
	}
	if err := c.Bind(&body); err != nil || body.StageID == 0 {
		return echo.NewHTTPError(http.StatusBadRequest, "stage_id is required")
	}

	// Verify stage belongs to same tenant
	var stage model.Stage
	if err := h.DB.Where("id = ? AND tenant_id = ?", body.StageID, tenantID).First(&stage).Error; err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid stage")
	}

	result := h.DB.Model(&model.Lead{}).
		Where("id = ? AND tenant_id = ?", id, tenantID).
		Update("stage_id", body.StageID)

	if result.RowsAffected == 0 {
		return echo.NewHTTPError(http.StatusNotFound, "lead not found")
	}
	return c.JSON(http.StatusOK, echo.Map{"message": "stage updated", "stage_id": body.StageID})
}

// DELETE /api/v1/leads/:id
func (h *LeadHandler) Delete(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)
	id, _ := strconv.Atoi(c.Param("id"))

	result := h.DB.Where("id = ? AND tenant_id = ?", id, tenantID).Delete(&model.Lead{})
	if result.RowsAffected == 0 {
		return echo.NewHTTPError(http.StatusNotFound, "lead not found")
	}

	// Decrement leads_count
	h.DB.Model(&model.Tenant{}).Where("id = ?", tenantID).
		UpdateColumn("leads_count", gorm.Expr("leads_count - 1"))

	return c.JSON(http.StatusOK, echo.Map{"message": "lead deleted"})
}
