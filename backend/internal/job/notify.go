package job

import (
	"github.com/dhavi/leadflow/internal/model"
	"gorm.io/gorm"
)

// upsertNotification creates a notification for (userID, type, relatedEntityType,
// relatedEntityID) unless the user already has an unread one for that exact
// entity+type — so a daily job doesn't pile up duplicate reminders for the
// same still-stale lead or still-overdue task, but does remind again once the
// previous one has been read and the condition still holds.
func upsertNotification(db *gorm.DB, tenantID, userID uint, notifType model.NotificationType, title, message, relatedEntityType string, relatedEntityID uint) {
	var count int64
	db.Model(&model.Notification{}).
		Where("tenant_id = ? AND user_id = ? AND type = ? AND related_entity_type = ? AND related_entity_id = ? AND is_read = false",
			tenantID, userID, notifType, relatedEntityType, relatedEntityID).
		Count(&count)
	if count > 0 {
		return
	}

	db.Create(&model.Notification{
		TenantID:          tenantID,
		UserID:            userID,
		Type:              notifType,
		Title:             title,
		Message:           message,
		RelatedEntityType: relatedEntityType,
		RelatedEntityID:   &relatedEntityID,
	})
}
