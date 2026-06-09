package config

import (
	"log"

	"github.com/dhavi/leadflow/internal/model"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

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

	// Auto-migrate all models
	if err := db.AutoMigrate(
		&model.Tenant{},
		&model.User{},
		&model.Contact{},
		&model.Stage{},
		&model.Lead{},
		&model.Activity{},
	); err != nil {
		return nil, err
	}

	log.Println("Database connected and migrated")
	return db, nil
}
