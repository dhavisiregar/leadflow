package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/dhavi/leadflow/internal/model"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type ReportHandler struct {
	DB *gorm.DB
}

// GET /api/v1/reports/summary?days=90
func (h *ReportHandler) Summary(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)

	days := 90
	if d := c.QueryParam("days"); d != "" {
		if parsed, err := strconv.Atoi(d); err == nil && parsed > 0 {
			days = parsed
		}
	}
	from := time.Now().AddDate(0, 0, -days)

	type MonthCount struct {
		Month string `json:"month"`
		Count int    `json:"count"`
	}
	type MonthRevenue struct {
		Month string  `json:"month"`
		Value float64 `json:"value"`
	}
	type CloseReasonCount struct {
		Reason string `json:"reason"`
		Count  int    `json:"count"`
	}

	var leadsCreated []MonthCount
	h.DB.Model(&model.Lead{}).
		Select("TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count").
		Where("tenant_id = ? AND created_at >= ?", tenantID, from).
		Group("month").
		Order("month asc").
		Scan(&leadsCreated)

	var revenueWon []MonthRevenue
	h.DB.Model(&model.Lead{}).
		Joins("JOIN stages ON stages.id = leads.stage_id").
		Select("TO_CHAR(leads.updated_at, 'YYYY-MM') as month, COALESCE(SUM(leads.value), 0) as value").
		Where("leads.tenant_id = ? AND stages.name = 'Won' AND leads.updated_at >= ?", tenantID, from).
		Group("month").
		Order("month asc").
		Scan(&revenueWon)

	var topCloseReasons []CloseReasonCount
	h.DB.Model(&model.Lead{}).
		Joins("JOIN stages ON stages.id = leads.stage_id").
		Select("leads.close_reason as reason, COUNT(*) as count").
		Where("leads.tenant_id = ? AND stages.name IN ('Won','Lost') AND leads.close_reason != '' AND leads.updated_at >= ?", tenantID, from).
		Group("leads.close_reason").
		Order("count desc").
		Limit(5).
		Scan(&topCloseReasons)

	type WonStats struct {
		Count int     `json:"count"`
		Total float64 `json:"total"`
	}
	var wonStats WonStats
	h.DB.Model(&model.Lead{}).
		Joins("JOIN stages ON stages.id = leads.stage_id").
		Select("COUNT(*) as count, COALESCE(SUM(leads.value), 0) as total").
		Where("leads.tenant_id = ? AND stages.name = 'Won' AND leads.updated_at >= ?", tenantID, from).
		Scan(&wonStats)

	var avgDealValue float64
	h.DB.Model(&model.Lead{}).
		Joins("JOIN stages ON stages.id = leads.stage_id").
		Select("COALESCE(AVG(leads.value), 0)").
		Where("leads.tenant_id = ? AND stages.name = 'Won' AND leads.updated_at >= ?", tenantID, from).
		Scan(&avgDealValue)

	var avgDaysToClose float64
	h.DB.Model(&model.Lead{}).
		Joins("JOIN stages ON stages.id = leads.stage_id").
		Select("COALESCE(AVG(EXTRACT(EPOCH FROM (leads.updated_at - leads.created_at)) / 86400), 0)").
		Where("leads.tenant_id = ? AND stages.name = 'Won' AND leads.updated_at >= ?", tenantID, from).
		Scan(&avgDaysToClose)

	if leadsCreated == nil {
		leadsCreated = []MonthCount{}
	}
	if revenueWon == nil {
		revenueWon = []MonthRevenue{}
	}
	if topCloseReasons == nil {
		topCloseReasons = []CloseReasonCount{}
	}

	return c.JSON(http.StatusOK, echo.Map{
		"leads_created_by_month": leadsCreated,
		"revenue_won_by_month":   revenueWon,
		"top_close_reasons":      topCloseReasons,
		"total_won":              wonStats.Count,
		"total_revenue":          wonStats.Total,
		"avg_deal_value":         avgDealValue,
		"avg_days_to_close":      avgDaysToClose,
	})
}
