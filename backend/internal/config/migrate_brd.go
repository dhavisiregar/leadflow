package config

import (
	"github.com/dhavi/leadflow/internal/model"
	"gorm.io/gorm"
)

// MigrateToBRDPipeline brings existing data in line with the Sales Pipeline
// Tracker BRD's 6-stage funnel + separate Active/On Hold/Won/Lost status.
// Both steps are idempotent and never drop lead data.
func MigrateToBRDPipeline(db *gorm.DB) error {
	if err := backfillLeadStatus(db); err != nil {
		return err
	}
	return upgradeDefaultStageSets(db)
}

// backfillLeadStatus sets Lead.Status from any stage still literally named
// "Won"/"Lost", for every tenant (custom stage sets included). This alone
// makes "board shows Active leads only" correct everywhere without touching
// the Stage table.
func backfillLeadStatus(db *gorm.DB) error {
	if err := db.Exec(`
		UPDATE leads SET status = 'won'
		FROM stages
		WHERE leads.stage_id = stages.id AND stages.name = 'Won' AND leads.status <> 'won'
	`).Error; err != nil {
		return err
	}
	return db.Exec(`
		UPDATE leads SET status = 'lost'
		FROM stages
		WHERE leads.stage_id = stages.id AND stages.name = 'Lost' AND leads.status <> 'lost'
	`).Error
}

// upgradeDefaultStageSets rewrites, in place, any tenant whose stages are
// still exactly the original 5-stage default (New Lead/Contacted/Negotiation/
// Won/Lost) into the BRD's 6-stage funnel. Renames happen on the same row
// IDs so every lead's stage_id stays valid. Tenants that have customized
// their stages (Pro/Team CustomStages) no longer match and are left alone.
func upgradeDefaultStageSets(db *gorm.DB) error {
	var tenantIDs []uint
	if err := db.Model(&model.Tenant{}).Pluck("id", &tenantIDs).Error; err != nil {
		return err
	}

	oldDefault := []string{"New Lead", "Contacted", "Negotiation", "Won", "Lost"}

	for _, tenantID := range tenantIDs {
		var stages []model.Stage
		if err := db.Where("tenant_id = ?", tenantID).Order(`"order" asc`).Find(&stages).Error; err != nil {
			return err
		}
		if len(stages) != len(oldDefault) {
			continue
		}
		matches := true
		for i, s := range stages {
			if s.Name != oldDefault[i] {
				matches = false
				break
			}
		}
		if !matches {
			continue
		}

		newLead, contacted, negotiation, won, lost := stages[0], stages[1], stages[2], stages[3], stages[4]

		err := db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Model(&newLead).Update("name", "Initial Meeting").Error; err != nil {
				return err
			}
			if err := tx.Model(&contacted).Update("name", "Requirement, Assessment, POC").Error; err != nil {
				return err
			}
			quotation := model.Stage{TenantID: tenantID, Name: "Quotation", Order: 3, Color: "#805AD5"}
			if err := tx.Create(&quotation).Error; err != nil {
				return err
			}
			if err := tx.Model(&negotiation).Update("order", 4).Error; err != nil {
				return err
			}
			po := model.Stage{TenantID: tenantID, Name: "PO", Order: 5, Color: "#DD6B20"}
			if err := tx.Create(&po).Error; err != nil {
				return err
			}
			if err := tx.Model(&won).Updates(map[string]interface{}{"name": "Invoiced", "order": 6}).Error; err != nil {
				return err
			}
			// Any lead still parked on the old "Lost" stage moves to
			// Negotiation (the stage the BRD calls out for lost deals);
			// the now-unreferenced Lost row is then safe to remove.
			if err := tx.Model(&model.Lead{}).Where("stage_id = ?", lost.ID).Update("stage_id", negotiation.ID).Error; err != nil {
				return err
			}
			return tx.Unscoped().Delete(&lost).Error
		})
		if err != nil {
			return err
		}
	}

	return nil
}
