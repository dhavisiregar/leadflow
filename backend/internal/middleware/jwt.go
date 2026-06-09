package middleware

import (
	"net/http"
	"strings"
	"time"

	"github.com/dhavi/leadflow/internal/model"
	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type JWTClaims struct {
	UserID   uint        `json:"user_id"`
	TenantID uint        `json:"tenant_id"`
	Role     model.Role  `json:"role"`
	jwt.RegisteredClaims
}

// GenerateToken creates a signed JWT for a user.
func GenerateToken(user *model.User, secret string, expiresHours int) (string, error) {
	claims := JWTClaims{
		UserID:   user.ID,
		TenantID: user.TenantID,
		Role:     user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(expiresHours) * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// JWT returns an Echo middleware that validates the Bearer token.
func JWT(secret string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			authHeader := c.Request().Header.Get("Authorization")
			if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
				return echo.NewHTTPError(http.StatusUnauthorized, "missing or invalid authorization header")
			}

			tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
			claims := &JWTClaims{}

			token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, echo.NewHTTPError(http.StatusUnauthorized, "unexpected signing method")
				}
				return []byte(secret), nil
			})

			if err != nil || !token.Valid {
				return echo.NewHTTPError(http.StatusUnauthorized, "invalid or expired token")
			}

			// Inject claims into context
			c.Set("user_id", claims.UserID)
			c.Set("tenant_id", claims.TenantID)
			c.Set("role", claims.Role)

			return next(c)
		}
	}
}

// TenantScope enforces that all DB queries are scoped to the authenticated tenant.
func TenantScope(db *gorm.DB) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			tenantID := c.Get("tenant_id").(uint)
			// Store scoped DB in context so handlers can use it
			scopedDB := db.Where("tenant_id = ?", tenantID)
			c.Set("db", scopedDB)
			c.Set("db_raw", db)
			return next(c)
		}
	}
}

// RequireOwner restricts a route to tenant owners only.
func RequireOwner(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		role := c.Get("role").(model.Role)
		if role != model.RoleOwner {
			return echo.NewHTTPError(http.StatusForbidden, "owner access required")
		}
		return next(c)
	}
}
