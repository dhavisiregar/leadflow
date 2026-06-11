package job

import (
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/resend/resend-go/v2"
	"gorm.io/gorm"
)

type StaleLeadJob struct {
	DB            *gorm.DB
	ResendAPIKey  string
	FromEmail     string
}

type staleLeadRow struct {
	LeadID         uint
	LeadTitle      string
	OwnerEmail     string
	OwnerName      string
	LastActivityAt *time.Time
	CreatedAt      time.Time
}

func (j *StaleLeadJob) Start() {
	go func() {
		j.run()
		ticker := time.NewTicker(24 * time.Hour)
		for range ticker.C {
			j.run()
		}
	}()
}

// RunNow triggers the job immediately — used for testing via admin endpoint.
func (j *StaleLeadJob) RunNow(staleDays int) {
	cutoff := time.Now().Add(-time.Duration(staleDays) * 24 * time.Hour)
	j.runWithCutoff(cutoff)
}

func (j *StaleLeadJob) run() {
	j.runWithCutoff(time.Now().Add(-7 * 24 * time.Hour))
}

func (j *StaleLeadJob) runWithCutoff(cutoff time.Time) {
	if j.ResendAPIKey == "" {
		return
	}

	var rows []staleLeadRow
	err := j.DB.Table("leads").
		Select("leads.id as lead_id, leads.title as lead_title, leads.last_activity_at, leads.created_at, users.email as owner_email, users.name as owner_name").
		Joins("JOIN users ON leads.owner_id = users.id").
		Joins("JOIN stages ON leads.stage_id = stages.id").
		Where("stages.name NOT IN ?", []string{"Won", "Lost"}).
		Where("COALESCE(leads.last_activity_at, leads.created_at) < ?", cutoff).
		Where("leads.deleted_at IS NULL").
		Scan(&rows).Error
	if err != nil {
		log.Printf("stale_leads job error: %v", err)
		return
	}

	if len(rows) == 0 {
		return
	}

	// Group by owner email
	byOwner := map[string][]staleLeadRow{}
	for _, r := range rows {
		byOwner[r.OwnerEmail] = append(byOwner[r.OwnerEmail], r)
	}

	client := resend.NewClient(j.ResendAPIKey)

	for email, leads := range byOwner {
		j.sendAlert(client, email, leads[0].OwnerName, leads)
	}
}

func (j *StaleLeadJob) sendAlert(client *resend.Client, toEmail, ownerName string, leads []staleLeadRow) {
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("<p>Hi %s,</p>", ownerName))
	sb.WriteString("<p>The following leads have had no activity for more than 7 days:</p>")
	sb.WriteString("<ul>")
	for _, l := range leads {
		ref := l.CreatedAt
		if l.LastActivityAt != nil {
			ref = *l.LastActivityAt
		}
		days := int(time.Since(ref).Hours() / 24)
		sb.WriteString(fmt.Sprintf("<li><strong>%s</strong> — %d days since last activity</li>", l.LeadTitle, days))
	}
	sb.WriteString("</ul>")
	sb.WriteString("<p>Log in to <a href='http://localhost:5173'>LeadFlow</a> to follow up.</p>")

	params := &resend.SendEmailRequest{
		From:    j.FromEmail,
		To:      []string{toEmail},
		Subject: "⚠️ You have stale leads in LeadFlow",
		Html:    sb.String(),
	}

	if _, err := client.Emails.Send(params); err != nil {
		log.Printf("stale_leads: failed to send email to %s: %v", toEmail, err)
	} else {
		log.Printf("stale_leads: alert sent to %s (%d leads)", toEmail, len(leads))
	}
}
