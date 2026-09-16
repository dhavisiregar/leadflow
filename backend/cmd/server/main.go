package main

import (
	"log"
	"net/http"

	"github.com/dhavi/leadflow/internal/config"
	"github.com/dhavi/leadflow/internal/handler"
	mw "github.com/dhavi/leadflow/internal/middleware"
	"github.com/dhavi/leadflow/internal/model"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

func main() {
	// ── Config ────────────────────────────────────────────────────────────────
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config error: %v", err)
	}

	// ── Database ──────────────────────────────────────────────────────────────
	db, err := config.NewDB(cfg)
	if err != nil {
		log.Fatalf("database error: %v", err)
	}

	// ── Echo ──────────────────────────────────────────────────────────────────
	e := echo.New()
	e.HideBanner = true

	// Global middleware
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: cfg.AllowedOrigins,
		AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete},
		AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAuthorization},
	}))

	// ── Handlers ──────────────────────────────────────────────────────────────
	authH := &handler.AuthHandler{DB: db, JWTSecret: cfg.JWTSecret, JWTExpiresHrs: cfg.JWTExpiresHours, GoogleClientID: cfg.GoogleClientID}
	leadH := &handler.LeadHandler{DB: db}
	leadServiceH := &handler.LeadServiceHandler{DB: db}
	activityH := &handler.ActivityHandler{DB: db}
	dashH := &handler.DashboardHandler{DB: db}
	stageH := &handler.StageHandler{DB: db}
	teamH := &handler.TeamHandler{DB: db}
	teamMemberH := &handler.TeamMemberHandler{DB: db}

	// ── Routes ────────────────────────────────────────────────────────────────
	api := e.Group("/api/v1")

	// Public routes
	api.POST("/auth/register", authH.Register)
	api.POST("/auth/login", authH.Login)
	api.POST("/auth/google", authH.GoogleLogin)

	// Protected routes
	protected := api.Group("", mw.JWT(cfg.JWTSecret))
	protected.GET("/auth/me", authH.Me)

	protected.GET("/dashboard/analytics", dashH.Analytics)

	protected.GET("/stages", stageH.List)

	protected.GET("/leads", leadH.List)
	protected.POST("/leads", leadH.Create)
	protected.GET("/leads/:id", leadH.Get)
	protected.PUT("/leads/:id", leadH.Update)
	protected.DELETE("/leads/:id", leadH.Delete)
	protected.PATCH("/leads/:id/stage", leadH.MoveStage)
	protected.PATCH("/leads/:id/status", leadH.UpdateStatus)

	protected.POST("/leads/:id/services", leadServiceH.Create)
	protected.DELETE("/leads/:id/services/:service_id", leadServiceH.Delete)

	protected.GET("/leads/:id/activities", activityH.List)
	protected.POST("/leads/:id/activities", activityH.Create)
	protected.PUT("/leads/:id/activities/:activity_id", activityH.Update)
	protected.DELETE("/leads/:id/activities/:activity_id", activityH.Delete)

	protected.GET("/teams", teamH.List, mw.RequireRole(model.RoleOwner))
	protected.POST("/teams", teamH.Create, mw.RequireRole(model.RoleOwner))
	protected.PUT("/teams/:id", teamH.Update, mw.RequireRole(model.RoleOwner))
	protected.DELETE("/teams/:id", teamH.Delete, mw.RequireRole(model.RoleOwner))

	protected.GET("/team-members", teamMemberH.List, mw.RequireRole(model.RoleOwner))
	protected.POST("/team-members", teamMemberH.Create, mw.RequireRole(model.RoleOwner))
	protected.PUT("/team-members/:id", teamMemberH.Update, mw.RequireRole(model.RoleOwner))
	protected.DELETE("/team-members/:id", teamMemberH.Delete, mw.RequireRole(model.RoleOwner))

	// Health check
	e.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, echo.Map{"status": "ok"})
	})

	// ── Start ─────────────────────────────────────────────────────────────────
	log.Printf("LeadFlow API starting on :%s (env: %s)", cfg.AppPort, cfg.AppEnv)
	e.Logger.Fatal(e.Start(":" + cfg.AppPort))
}
