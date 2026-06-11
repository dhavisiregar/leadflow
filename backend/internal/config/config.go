package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	AppPort            string
	AppEnv             string
	DBHost             string
	DBPort             string
	DBUser             string
	DBPassword         string
	DBName             string
	JWTSecret          string
	JWTExpiresHours    int
	MidtransServerKey  string
	MidtransClientKey  string
	MidtransProduction bool
	ResendAPIKey       string
	AlertFromEmail     string
}

func Load() (*Config, error) {
	// Load .env file (ignore error in production — env vars may be set directly)
	_ = godotenv.Load()

	expiresHours, _ := strconv.Atoi(getEnv("JWT_EXPIRES_HOURS", "72"))

	cfg := &Config{
		AppPort:         getEnv("APP_PORT", "8080"),
		AppEnv:          getEnv("APP_ENV", "development"),
		DBHost:          getEnv("DB_HOST", "localhost"),
		DBPort:          getEnv("DB_PORT", "5432"),
		DBUser:          getEnv("DB_USER", "postgres"),
		DBPassword:      getEnv("DB_PASSWORD", ""),
		DBName:          getEnv("DB_NAME", "leadflow"),
		JWTSecret:          getEnv("JWT_SECRET", ""),
		JWTExpiresHours:    expiresHours,
		MidtransServerKey:  getEnv("MIDTRANS_SERVER_KEY", ""),
		MidtransClientKey:  getEnv("MIDTRANS_CLIENT_KEY", ""),
		MidtransProduction: getEnv("MIDTRANS_ENV", "sandbox") == "production",
		ResendAPIKey:       getEnv("RESEND_API_KEY", ""),
		AlertFromEmail:     getEnv("ALERT_FROM_EMAIL", "alerts@leadflow.dev"),
	}

	if cfg.JWTSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET is required")
	}

	return cfg, nil
}

func (c *Config) DSN() string {
	return fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Jakarta",
		c.DBHost, c.DBUser, c.DBPassword, c.DBName, c.DBPort,
	)
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
