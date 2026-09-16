package config

import (
	"log"

	"github.com/dhavi/leadflow/internal/model"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// backfillLeadCompany makes sure "leads"."company" has no NULLs left before
// AutoMigrate tries to add/enforce its NOT NULL constraint. Safe on a fresh
// database (no "leads" table yet — AutoMigrate creates it cleanly) and safe
// to run on every boot (no-op once there's nothing left to backfill).
func backfillLeadCompany(db *gorm.DB) error {
	m := db.Migrator()
	if !m.HasTable(&model.Lead{}) {
		return nil
	}
	if !m.HasColumn(&model.Lead{}, "Company") {
		// Add it nullable first so the backfill below has a column to set,
		// and so AutoMigrate's later NOT NULL pass has nothing left to violate.
		if err := db.Exec(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS company text`).Error; err != nil {
			return err
		}
	}
	return db.Exec(`UPDATE leads SET company = '' WHERE company IS NULL`).Error
}

func NewDB(cfg *Config) (*gorm.DB, error) {
	logLevel := logger.Silent
	if cfg.AppEnv == "development" {
		logLevel = logger.Info
	}

	db, err := gorm.Open(postgres.Open(cfg.DSN()), &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	})
	if err != nil {
		return nil, err
	}

	// Must run before AutoMigrate: on a database from before Lead.Company
	// existed (or before it was made required), existing rows have NULL
	// there. Postgres refuses to add/enforce a NOT NULL constraint over
	// existing NULLs, which otherwise fails AutoMigrate on every boot.
	if err := backfillLeadCompany(db); err != nil {
		return nil, err
	}

	// Auto-migrate all models
	if err := db.AutoMigrate(
		&model.Tenant{},
		&model.Team{},
		&model.User{},
		&model.Stage{},
		&model.Lead{},
		&model.LeadService{},
		&model.Activity{},
	); err != nil {
		return nil, err
	}

	if err := MigrateToBRDPipeline(db); err != nil {
		return nil, err
	}

	log.Println("Database connected and migrated")
	return db, nil
}
