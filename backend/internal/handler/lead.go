package handler

import (
	"log"
	"net/http"
	"strconv"

	mw "github.com/dhavi/leadflow/internal/middleware"
	"github.com/dhavi/leadflow/internal/model"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type LeadHandler struct {
	DB *gorm.DB
}

// GET /api/v1/leads
func (h *LeadHandler) List(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)
	role := c.Get("role").(model.Role)
	userID := c.Get("user_id").(uint)

	var leads []model.Lead
	query := mw.ScopeLeadsByRole(h.DB.Where("tenant_id = ?", tenantID), role, userID).
		Preload("Contact").
		Preload("Stage").
		Preload("Owner").
		Preload("Services")

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
	role := c.Get("role").(model.Role)
	userID := c.Get("user_id").(uint)
	id, _ := strconv.Atoi(c.Param("id"))

	var tenant model.Tenant
	if err := h.DB.First(&tenant, tenantID).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "tenant not found")
	}

	if !model.Limits[tenant.Plan].LeadDetailPage {
		return echo.NewHTTPError(http.StatusForbidden, map[string]interface{}{
			"message": "lead detail page is not available on your plan",
			"plan":    tenant.Plan,
		})
	}

	var lead model.Lead
	query := mw.ScopeLeadsByRole(h.DB.Where("id = ? AND tenant_id = ?", id, tenantID), role, userID)
	if err := query.
		Preload("Contact").Preload("Stage").Preload("Owner").Preload("Services").
		First(&lead).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "lead not found")
	}
	return c.JSON(http.StatusOK, lead)
}

// POST /api/v1/leads
func (h *LeadHandler) Create(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)
	role := c.Get("role").(model.Role)
	ownerID := c.Get("user_id").(uint)

	if !mw.CanManageLeads(role) {
		return echo.NewHTTPError(http.StatusForbidden, "you do not have permission to create leads")
	}

	var tenant model.Tenant
	h.DB.First(&tenant, tenantID)
	if !tenant.CanAddLead() {
		l := model.Limits[tenant.Plan]
		return echo.NewHTTPError(http.StatusPaymentRequired, map[string]interface{}{
			"message": "lead limit reached. Please upgrade.",
			"limit":   l.MaxLeads,
			"plan":    tenant.Plan,
		})
	}

	var lead model.Lead
	if err := c.Bind(&lead); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	lead.TenantID = tenantID
	// Sales reps can only ever create leads for themselves; only Owner may
	// assign a lead to someone else.
	if role != model.RoleOwner || lead.OwnerID == 0 {
		lead.OwnerID = ownerID
	}
	if lead.Status == "" {
		lead.Status = model.LeadStatusActive
	}
	if lead.LeadType == "" {
		lead.LeadType = "new"
	}

	if err := h.DB.Create(&lead).Error; err != nil {
		log.Printf("create lead error: %v | lead: %+v", err, lead)
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to create lead")
	}

	// Increment tenant leads_count
	h.DB.Model(&tenant).UpdateColumn("leads_count", gorm.Expr("leads_count + 1"))

	return c.JSON(http.StatusCreated, lead)
}

// PUT /api/v1/leads/:id
func (h *LeadHandler) Update(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)
	role := c.Get("role").(model.Role)
	userID := c.Get("user_id").(uint)
	id, _ := strconv.Atoi(c.Param("id"))

	if !mw.CanManageLeads(role) {
		return echo.NewHTTPError(http.StatusForbidden, "you do not have permission to edit leads")
	}

	var lead model.Lead
	query := mw.ScopeLeadsByRole(h.DB.Where("id = ? AND tenant_id = ?", id, tenantID), role, userID)
	if err := query.First(&lead).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "lead not found")
	}

	ownerID := lead.OwnerID
	if err := c.Bind(&lead); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	// Protect immutable fields
	lead.ID = uint(id)
	lead.TenantID = tenantID
	if role != model.RoleOwner {
		lead.OwnerID = ownerID // sales cannot reassign their own leads
	}

	if err := h.DB.Save(&lead).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to update lead")
	}
	return c.JSON(http.StatusOK, lead)
}

// PATCH /api/v1/leads/:id/status
func (h *LeadHandler) UpdateStatus(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)
	role := c.Get("role").(model.Role)
	userID := c.Get("user_id").(uint)
	id, _ := strconv.Atoi(c.Param("id"))

	if !mw.CanManageLeads(role) {
		return echo.NewHTTPError(http.StatusForbidden, "you do not have permission to edit leads")
	}

	var body struct {
		Status      model.LeadStatus `json:"status"`
		CloseReason string           `json:"close_reason"`
		CloseNote   string           `json:"close_note"`
	}
	if err := c.Bind(&body); err != nil || body.Status == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "status is required")
	}
	switch body.Status {
	case model.LeadStatusActive, model.LeadStatusOnHold, model.LeadStatusWon, model.LeadStatusLost:
	default:
		return echo.NewHTTPError(http.StatusBadRequest, "invalid status")
	}
	if (body.Status == model.LeadStatusWon || body.Status == model.LeadStatusLost) && body.CloseReason == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "close_reason is required for Won/Lost")
	}

	query := mw.ScopeLeadsByRole(h.DB.Where("id = ? AND tenant_id = ?", id, tenantID), role, userID)
	var lead model.Lead
	if err := query.First(&lead).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "lead not found")
	}

	updates := map[string]interface{}{"status": body.Status}
	if body.Status == model.LeadStatusWon || body.Status == model.LeadStatusLost {
		updates["close_reason"] = body.CloseReason
		updates["close_note"] = body.CloseNote
	} else {
		updates["close_reason"] = ""
		updates["close_note"] = ""
	}

	if err := h.DB.Model(&lead).Updates(updates).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to update status")
	}
	return c.JSON(http.StatusOK, echo.Map{"message": "status updated", "status": body.Status})
}

// PATCH /api/v1/leads/:id/stage
func (h *LeadHandler) MoveStage(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)
	role := c.Get("role").(model.Role)
	userID := c.Get("user_id").(uint)
	id, _ := strconv.Atoi(c.Param("id"))

	if !mw.CanManageLeads(role) {
		return echo.NewHTTPError(http.StatusForbidden, "you do not have permission to edit leads")
	}

	var body struct {
		StageID     uint   `json:"stage_id"`
		CloseReason string `json:"close_reason"`
		CloseNote   string `json:"close_note"`
	}
	if err := c.Bind(&body); err != nil || body.StageID == 0 {
		return echo.NewHTTPError(http.StatusBadRequest, "stage_id is required")
	}

	// Verify stage belongs to same tenant
	var stage model.Stage
	if err := h.DB.Where("id = ? AND tenant_id = ?", body.StageID, tenantID).First(&stage).Error; err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid stage")
	}

	// Legacy/custom stage sets may still have literal Won/Lost stages.
	if (stage.Name == "Won" || stage.Name == "Lost") && body.CloseReason == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "close_reason is required for Won/Lost stages")
	}

	updates := map[string]interface{}{"stage_id": body.StageID}
	if body.CloseReason != "" {
		updates["close_reason"] = body.CloseReason
		updates["close_note"] = body.CloseNote
	}
	if stage.Name == "Won" {
		updates["status"] = model.LeadStatusWon
	} else if stage.Name == "Lost" {
		updates["status"] = model.LeadStatusLost
	}

	query := mw.ScopeLeadsByRole(h.DB.Model(&model.Lead{}).Where("id = ? AND tenant_id = ?", id, tenantID), role, userID)
	result := query.Updates(updates)

	if result.RowsAffected == 0 {
		return echo.NewHTTPError(http.StatusNotFound, "lead not found")
	}
	return c.JSON(http.StatusOK, echo.Map{"message": "stage updated", "stage_id": body.StageID})
}

// DELETE /api/v1/leads/:id
func (h *LeadHandler) Delete(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)
	role := c.Get("role").(model.Role)
	userID := c.Get("user_id").(uint)
	id, _ := strconv.Atoi(c.Param("id"))

	if !mw.CanManageLeads(role) {
		return echo.NewHTTPError(http.StatusForbidden, "you do not have permission to delete leads")
	}

	query := mw.ScopeLeadsByRole(h.DB.Where("id = ? AND tenant_id = ?", id, tenantID), role, userID)
	result := query.Delete(&model.Lead{})
	if result.RowsAffected == 0 {
		return echo.NewHTTPError(http.StatusNotFound, "lead not found")
	}

	// Decrement leads_count
	h.DB.Model(&model.Tenant{}).Where("id = ?", tenantID).
		UpdateColumn("leads_count", gorm.Expr("leads_count - 1"))

	return c.JSON(http.StatusOK, echo.Map{"message": "lead deleted"})
}
