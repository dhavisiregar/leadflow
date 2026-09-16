package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	AppPort         string
	AppEnv          string
	DBHost          string
	DBPort          string
	DBUser          string
	DBPassword      string
	DBName          string
	JWTSecret       string
	JWTExpiresHours int
	AllowedOrigins  []string
	DBSSLMode       string
	GoogleClientID  string
}

func Load() (*Config, error) {
	// Load .env file (ignore error in production — env vars may be set directly)
	_ = godotenv.Load()

	expiresHours, _ := strconv.Atoi(getEnv("JWT_EXPIRES_HOURS", "72"))

	cfg := &Config{
		AppPort:         getEnv("APP_PORT", getEnv("PORT", "8080")),
		AppEnv:          getEnv("APP_ENV", "development"),
		DBHost:          getEnv("DB_HOST", "localhost"),
		DBPort:          getEnv("DB_PORT", "5432"),
		DBUser:          getEnv("DB_USER", "postgres"),
		DBPassword:      getEnv("DB_PASSWORD", ""),
		DBName:          getEnv("DB_NAME", "leadflow"),
		JWTSecret:       getEnv("JWT_SECRET", ""),
		JWTExpiresHours: expiresHours,
		AllowedOrigins:  strings.Split(getEnv("ALLOWED_ORIGINS", "http://localhost:5173"), ","),
		DBSSLMode:       getEnv("DB_SSLMODE", "disable"),
		GoogleClientID:  getEnv("GOOGLE_CLIENT_ID", ""),
	}

	if cfg.JWTSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET is required")
	}

	return cfg, nil
}

func (c *Config) DSN() string {
	// password is quoted: an empty, unquoted value in this keyword/value DSN
	// format gets misparsed by libpq, silently dropping every key after it.
	return fmt.Sprintf(
		"host=%s user=%s password='%s' dbname=%s port=%s sslmode=%s TimeZone=Asia/Jakarta",
		c.DBHost, c.DBUser, c.DBPassword, c.DBName, c.DBPort, c.DBSSLMode,
	)
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
