package main

import (
	"log"
	"net/http"

	"github.com/dhavi/leadflow/internal/config"
	"github.com/dhavi/leadflow/internal/handler"
	mw "github.com/dhavi/leadflow/internal/middleware"
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
		AllowOrigins: []string{"http://localhost:5173", "https://leadflow.yourdomain.com"},
		AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete},
		AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAuthorization},
	}))

	// ── Handlers ──────────────────────────────────────────────────────────────
	authH := &handler.AuthHandler{DB: db, JWTSecret: cfg.JWTSecret, JWTExpiresHrs: cfg.JWTExpiresHours}
	leadH := &handler.LeadHandler{DB: db}
	contactH := &handler.ContactHandler{DB: db}
	activityH := &handler.ActivityHandler{DB: db}
	dashH := &handler.DashboardHandler{DB: db}
	stageH := &handler.StageHandler{DB: db}
	planH := &handler.PlanHandler{DB: db}
	paymentH := &handler.PaymentHandler{
		DB:         db,
		ServerKey:  cfg.MidtransServerKey,
		ClientKey:  cfg.MidtransClientKey,
		Production: cfg.MidtransProduction,
	}

	// ── Routes ────────────────────────────────────────────────────────────────
	api := e.Group("/api/v1")

	// Public routes
	api.POST("/auth/register", authH.Register)
	api.POST("/auth/login", authH.Login)

	// Protected routes
	protected := api.Group("", mw.JWT(cfg.JWTSecret))
	protected.GET("/auth/me", authH.Me)

	protected.GET("/dashboard/stats", dashH.Stats)

	protected.GET("/plan", planH.Get)
	protected.POST("/plan/downgrade", planH.Downgrade)
	protected.POST("/payment/create", paymentH.Create)
	protected.POST("/payment/verify", paymentH.Verify)
	api.POST("/payment/webhook", paymentH.Webhook)
	protected.GET("/stages", stageH.List)

	protected.GET("/leads", leadH.List)
	protected.POST("/leads", leadH.Create)
	protected.GET("/leads/:id", leadH.Get)
	protected.PUT("/leads/:id", leadH.Update)
	protected.DELETE("/leads/:id", leadH.Delete)
	protected.PATCH("/leads/:id/stage", leadH.MoveStage)

	protected.GET("/leads/:id/activities", activityH.List)
	protected.POST("/leads/:id/activities", activityH.Create)

	protected.GET("/contacts", contactH.List)
	protected.POST("/contacts", contactH.Create)
	protected.GET("/contacts/:id", contactH.Get)
	protected.PUT("/contacts/:id", contactH.Update)
	protected.DELETE("/contacts/:id", contactH.Delete)

	// Health check
	e.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, echo.Map{"status": "ok"})
	})

	// ── Start ─────────────────────────────────────────────────────────────────
	log.Printf("LeadFlow API starting on :%s (env: %s)", cfg.AppPort, cfg.AppEnv)
	e.Logger.Fatal(e.Start(":" + cfg.AppPort))
}
