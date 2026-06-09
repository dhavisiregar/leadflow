package handler

import (
	"net/http"

	"github.com/dhavi/leadflow/internal/model"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type DashboardHandler struct {
	DB *gorm.DB
}

// GET /api/v1/dashboard/stats
func (h *DashboardHandler) Stats(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)

	// Total leads
	var totalLeads int64
	h.DB.Model(&model.Lead{}).Where("tenant_id = ?", tenantID).Count(&totalLeads)

	// Pipeline value (sum of all open leads — exclude Won/Lost by checking stage name)
	var pipelineValue float64
	h.DB.Model(&model.Lead{}).
		Joins("JOIN stages ON stages.id = leads.stage_id").
		Where("leads.tenant_id = ? AND stages.name NOT IN ('Won', 'Lost')", tenantID).
		Select("COALESCE(SUM(leads.value), 0)").Scan(&pipelineValue)

	// Won leads count
	var wonCount int64
	h.DB.Model(&model.Lead{}).
		Joins("JOIN stages ON stages.id = leads.stage_id").
		Where("leads.tenant_id = ? AND stages.name = 'Won'", tenantID).
		Count(&wonCount)

	// Conversion rate
	var conversionRate float64
	if totalLeads > 0 {
		conversionRate = float64(wonCount) / float64(totalLeads) * 100
	}

	// Activities this month
	var activitiesThisMonth int64
	h.DB.Model(&model.Activity{}).
		Joins("JOIN leads ON leads.id = activities.lead_id").
		Where("leads.tenant_id = ? AND DATE_TRUNC('month', activities.created_at) = DATE_TRUNC('month', NOW())", tenantID).
		Count(&activitiesThisMonth)

	// Leads per stage
	type StageCount struct {
		StageName string  `json:"stage_name"`
		Color     string  `json:"color"`
		Count     int64   `json:"count"`
		Value     float64 `json:"value"`
	}
	var stageCounts []StageCount
	h.DB.Model(&model.Lead{}).
		Select("stages.name as stage_name, stages.color, COUNT(leads.id) as count, COALESCE(SUM(leads.value), 0) as value").
		Joins("JOIN stages ON stages.id = leads.stage_id").
		Where("leads.tenant_id = ?", tenantID).
		Group("stages.name, stages.color, stages.order").
		Order("stages.order").
		Scan(&stageCounts)

	return c.JSON(http.StatusOK, echo.Map{
		"total_leads":           totalLeads,
		"pipeline_value":        pipelineValue,
		"won_count":             wonCount,
		"conversion_rate":       conversionRate,
		"activities_this_month": activitiesThisMonth,
		"leads_by_stage":        stageCounts,
	})
}
