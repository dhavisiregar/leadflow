package handler

import (
	"net/http"
	"strconv"

	"github.com/dhavi/leadflow/internal/model"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type NotificationHandler struct {
	DB *gorm.DB
}

// GET /api/v1/notifications
func (h *NotificationHandler) List(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)
	userID := c.Get("user_id").(uint)

	var notifications []model.Notification
	if err := h.DB.Where("tenant_id = ? AND user_id = ?", tenantID, userID).
		Order("created_at desc").Limit(50).Find(&notifications).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to fetch notifications")
	}

	var unreadCount int64
	h.DB.Model(&model.Notification{}).
		Where("tenant_id = ? AND user_id = ? AND is_read = false", tenantID, userID).
		Count(&unreadCount)

	return c.JSON(http.StatusOK, echo.Map{
		"notifications": notifications,
		"unread_count":  unreadCount,
	})
}

// PATCH /api/v1/notifications/:id/read
func (h *NotificationHandler) MarkRead(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)
	userID := c.Get("user_id").(uint)
	id, _ := strconv.Atoi(c.Param("id"))

	result := h.DB.Model(&model.Notification{}).
		Where("id = ? AND tenant_id = ? AND user_id = ?", id, tenantID, userID).
		Update("is_read", true)
	if result.RowsAffected == 0 {
		return echo.NewHTTPError(http.StatusNotFound, "notification not found")
	}
	return c.JSON(http.StatusOK, echo.Map{"message": "marked as read"})
}

// PATCH /api/v1/notifications/read-all
func (h *NotificationHandler) MarkAllRead(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)
	userID := c.Get("user_id").(uint)

	h.DB.Model(&model.Notification{}).
		Where("tenant_id = ? AND user_id = ? AND is_read = false", tenantID, userID).
		Update("is_read", true)
	return c.JSON(http.StatusOK, echo.Map{"message": "all marked as read"})
}
