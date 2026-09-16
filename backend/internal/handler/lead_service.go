package handler

import (
	"net/http"
	"strconv"

	mw "github.com/dhavi/leadflow/internal/middleware"
	"github.com/dhavi/leadflow/internal/model"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type LeadServiceHandler struct {
	DB *gorm.DB
}

// findOwnedLead loads the lead the caller is allowed to edit (owner or the
// sales rep who owns it), 404-ing otherwise.
func (h *LeadServiceHandler) findOwnedLead(c echo.Context) (*model.Lead, error) {
	tenantID := c.Get("tenant_id").(uint)
	role := c.Get("role").(model.Role)
	userID := c.Get("user_id").(uint)
	leadID, _ := strconv.Atoi(c.Param("id"))

	var lead model.Lead
	query := mw.ScopeLeadsByRole(h.DB.Where("id = ? AND tenant_id = ?", leadID, tenantID), role, userID)
	if err := query.First(&lead).Error; err != nil {
		return nil, echo.NewHTTPError(http.StatusNotFound, "lead not found")
	}
	return &lead, nil
}

// recalculateValue sums a lead's services back into Lead.Value.
func (h *LeadServiceHandler) recalculateValue(lead *model.Lead) error {
	var total float64
	if err := h.DB.Model(&model.LeadService{}).
		Where("lead_id = ?", lead.ID).
		Select("COALESCE(SUM(value), 0)").Scan(&total).Error; err != nil {
		return err
	}
	return h.DB.Model(lead).Update("value", total).Error
}

// POST /api/v1/leads/:id/services
func (h *LeadServiceHandler) Create(c echo.Context) error {
	role := c.Get("role").(model.Role)
	if !mw.CanManageLeads(role) {
		return echo.NewHTTPError(http.StatusForbidden, "you do not have permission to edit leads")
	}

	lead, err := h.findOwnedLead(c)
	if err != nil {
		return err
	}

	var body struct {
		Name  string  `json:"name"`
		Value float64 `json:"value"`
	}
	if err := c.Bind(&body); err != nil || body.Name == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "name is required")
	}

	svc := model.LeadService{LeadID: lead.ID, Name: body.Name, Value: body.Value}
	if err := h.DB.Create(&svc).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to add service")
	}
	if err := h.recalculateValue(lead); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to recalculate deal value")
	}

	h.DB.Preload("Services").First(lead, lead.ID)
	return c.JSON(http.StatusCreated, lead)
}

// DELETE /api/v1/leads/:id/services/:service_id
func (h *LeadServiceHandler) Delete(c echo.Context) error {
	role := c.Get("role").(model.Role)
	if !mw.CanManageLeads(role) {
		return echo.NewHTTPError(http.StatusForbidden, "you do not have permission to edit leads")
	}

	lead, err := h.findOwnedLead(c)
	if err != nil {
		return err
	}

	serviceID, _ := strconv.Atoi(c.Param("service_id"))
	result := h.DB.Where("id = ? AND lead_id = ?", serviceID, lead.ID).Delete(&model.LeadService{})
	if result.RowsAffected == 0 {
		return echo.NewHTTPError(http.StatusNotFound, "service not found")
	}
	if err := h.recalculateValue(lead); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to recalculate deal value")
	}

	h.DB.Preload("Services").First(lead, lead.ID)
	return c.JSON(http.StatusOK, lead)
}
