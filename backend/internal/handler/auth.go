package handler

import (
	"net/http"
	"strings"

	"github.com/dhavi/leadflow/internal/middleware"
	"github.com/dhavi/leadflow/internal/model"
	"github.com/labstack/echo/v4"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthHandler struct {
	DB            *gorm.DB
	JWTSecret     string
	JWTExpiresHrs int
}

// ── Register ──────────────────────────────────────────────────────────────────

type RegisterRequest struct {
	Name         string `json:"name" validate:"required"`
	Email        string `json:"email" validate:"required,email"`
	Password     string `json:"password" validate:"required,min=8"`
	TenantName   string `json:"tenant_name" validate:"required"`
}

// POST /api/v1/auth/register
// Creates a new tenant + owner user in one transaction.
func (h *AuthHandler) Register(c echo.Context) error {
	var req RegisterRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	// Simple slug: lowercase, spaces → dashes
	slug := strings.ToLower(strings.ReplaceAll(req.TenantName, " ", "-"))

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to hash password")
	}

	var user model.User
	err = h.DB.Transaction(func(tx *gorm.DB) error {
		// Check email uniqueness
		var existing model.User
		if err := tx.Where("email = ?", req.Email).First(&existing).Error; err == nil {
			return echo.NewHTTPError(http.StatusConflict, "email already registered")
		}

		// Create tenant
		tenant := model.Tenant{Name: req.TenantName, Slug: slug, Plan: model.PlanFree}
		if err := tx.Create(&tenant).Error; err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "failed to create tenant")
		}

		// Create owner user
		user = model.User{
			TenantID: tenant.ID,
			Name:     req.Name,
			Email:    req.Email,
			Password: string(hashed),
			Role:     model.RoleOwner,
		}
		if err := tx.Create(&user).Error; err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "failed to create user")
		}

		// Seed default pipeline stages
		stages := []model.Stage{
			{TenantID: tenant.ID, Name: "New Lead", Order: 1, Color: "#718096"},
			{TenantID: tenant.ID, Name: "Contacted", Order: 2, Color: "#3182CE"},
			{TenantID: tenant.ID, Name: "Negotiation", Order: 3, Color: "#D69E2E"},
			{TenantID: tenant.ID, Name: "Won", Order: 4, Color: "#38A169"},
			{TenantID: tenant.ID, Name: "Lost", Order: 5, Color: "#E53E3E"},
		}
		if err := tx.Create(&stages).Error; err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "failed to seed stages")
		}

		return nil
	})
	if err != nil {
		return err
	}

	token, err := middleware.GenerateToken(&user, h.JWTSecret, h.JWTExpiresHrs)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to generate token")
	}

	return c.JSON(http.StatusCreated, echo.Map{
		"token": token,
		"user": echo.Map{
			"id":        user.ID,
			"name":      user.Name,
			"email":     user.Email,
			"role":      user.Role,
			"tenant_id": user.TenantID,
		},
	})
}

// ── Login ─────────────────────────────────────────────────────────────────────

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

// POST /api/v1/auth/login
func (h *AuthHandler) Login(c echo.Context) error {
	var req LoginRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	var user model.User
	if err := h.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid email or password")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid email or password")
	}

	token, err := middleware.GenerateToken(&user, h.JWTSecret, h.JWTExpiresHrs)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to generate token")
	}

	return c.JSON(http.StatusOK, echo.Map{
		"token": token,
		"user": echo.Map{
			"id":        user.ID,
			"name":      user.Name,
			"email":     user.Email,
			"role":      user.Role,
			"tenant_id": user.TenantID,
		},
	})
}

// ── Me ────────────────────────────────────────────────────────────────────────

// GET /api/v1/auth/me  (protected)
func (h *AuthHandler) Me(c echo.Context) error {
	userID := c.Get("user_id").(uint)

	var user model.User
	if err := h.DB.Preload("Tenant").First(&user, userID).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "user not found")
	}

	return c.JSON(http.StatusOK, echo.Map{
		"id":        user.ID,
		"name":      user.Name,
		"email":     user.Email,
		"role":      user.Role,
		"tenant_id": user.TenantID,
		"tenant":    user.Tenant,
	})
}
