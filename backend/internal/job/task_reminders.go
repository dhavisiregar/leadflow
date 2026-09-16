package job

import (
	"log"
	"time"

	"github.com/dhavi/leadflow/internal/model"
	"gorm.io/gorm"
)

// TaskReminderJob creates in-app notifications for tasks that are due today
// or overdue. It has no email leg (unlike StaleLeadJob) — just the
// notifications bell.
type TaskReminderJob struct {
	DB *gorm.DB
}

type taskReminderRow struct {
	TaskID   uint
	Title    string
	TenantID uint
	OwnerID  uint
}

func (j *TaskReminderJob) Start() {
	go func() {
		j.run()
		ticker := time.NewTicker(24 * time.Hour)
		for range ticker.C {
			j.run()
		}
	}()
}

// RunNow triggers the job immediately — used for testing via admin endpoint.
func (j *TaskReminderJob) RunNow() {
	j.run()
}

func (j *TaskReminderJob) run() {
	today := time.Now().Format("2006-01-02")

	var dueToday []taskReminderRow
	if err := j.DB.Table("tasks").
		Select("id as task_id, title, tenant_id, owner_id").
		Where("is_completed = false AND deleted_at IS NULL AND DATE(due_date) = ?", today).
		Scan(&dueToday).Error; err != nil {
		log.Printf("task_reminders job error (due today): %v", err)
	}
	for _, t := range dueToday {
		upsertNotification(j.DB, t.TenantID, t.OwnerID, model.NotifTaskDue,
			"Task due today", t.Title, "task", t.TaskID)
	}

	var overdue []taskReminderRow
	if err := j.DB.Table("tasks").
		Select("id as task_id, title, tenant_id, owner_id").
		Where("is_completed = false AND deleted_at IS NULL AND due_date IS NOT NULL AND DATE(due_date) < ?", today).
		Scan(&overdue).Error; err != nil {
		log.Printf("task_reminders job error (overdue): %v", err)
	}
	for _, t := range overdue {
		upsertNotification(j.DB, t.TenantID, t.OwnerID, model.NotifTaskOverdue,
			"Task overdue", t.Title, "task", t.TaskID)
	}
}
