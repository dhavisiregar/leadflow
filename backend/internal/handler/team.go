package handler

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/dhavi/leadflow/internal/model"
	"github.com/labstack/echo/v4"
	"github.com/resend/resend-go/v2"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type TeamHandler struct {
	DB           *gorm.DB
	ResendAPIKey string
	FromEmail    string
	FrontendURL  string
}

// GET /api/v1/team/members
func (h *TeamHandler) List(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)

	var members []model.User
	if err := h.DB.Where("tenant_id = ?", tenantID).Order("created_at asc").Find(&members).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to fetch team members")
	}
	return c.JSON(http.StatusOK, members)
}

// ── Invite ────────────────────────────────────────────────────────────────────

type InviteRequest struct {
	Name  string `json:"name" validate:"required"`
	Email string `json:"email" validate:"required,email"`
	Role  string `json:"role" validate:"required"`
}

// POST /api/v1/team/invite  (owner only)
func (h *TeamHandler) Invite(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)

	var req InviteRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if req.Name == "" || req.Email == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "name and email are required")
	}
	role := model.Role(req.Role)
	if role != model.RoleOwner && role != model.RoleMember {
		return echo.NewHTTPError(http.StatusBadRequest, "role must be 'owner' or 'member'")
	}

	var tenant model.Tenant
	if err := h.DB.First(&tenant, tenantID).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "tenant not found")
	}

	var currentCount int64
	h.DB.Model(&model.User{}).Where("tenant_id = ?", tenantID).Count(&currentCount)
	if !tenant.CanAddUser(int(currentCount)) {
		l := model.Limits[tenant.Plan]
		return echo.NewHTTPError(http.StatusPaymentRequired, map[string]interface{}{
			"message": "team member limit reached. Please upgrade.",
			"limit":   l.MaxUsers,
			"plan":    tenant.Plan,
		})
	}

	var existing model.User
	if err := h.DB.Where("email = ?", req.Email).First(&existing).Error; err == nil {
		return echo.NewHTTPError(http.StatusConflict, "email already registered")
	}

	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to create invite")
	}
	token := hex.EncodeToString(tokenBytes)
	expiresAt := time.Now().Add(7 * 24 * time.Hour)

	// Invited users don't set a password until they accept; store an unusable random hash.
	randomBytes := make([]byte, 32)
	if _, err := rand.Read(randomBytes); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to create invite")
	}
	hashed, err := bcrypt.GenerateFromPassword(randomBytes, bcrypt.DefaultCost)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to create invite")
	}

	member := model.User{
		TenantID:        tenantID,
		Name:            req.Name,
		Email:           req.Email,
		Password:        string(hashed),
		Role:            role,
		Status:          "pending",
		InviteToken:     &token,
		InviteExpiresAt: &expiresAt,
	}
	if err := h.DB.Create(&member).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to create invite")
	}

	h.sendInviteEmail(member.Email, member.Name, tenant.Name, token)

	return c.JSON(http.StatusCreated, member)
}

func (h *TeamHandler) sendInviteEmail(toEmail, name, tenantName, token string) {
	if h.ResendAPIKey == "" {
		return
	}
	link := fmt.Sprintf("%s/accept-invite?token=%s", h.FrontendURL, token)
	html := fmt.Sprintf(
		"<p>Hi %s,</p><p>You've been invited to join <strong>%s</strong> on LeadFlow.</p>"+
			"<p><a href=\"%s\">Accept the invite</a> to set your password and get started.</p>"+
			"<p>This link expires in 7 days.</p>",
		name, tenantName, link,
	)
	client := resend.NewClient(h.ResendAPIKey)
	params := &resend.SendEmailRequest{
		From:    h.FromEmail,
		To:      []string{toEmail},
		Subject: fmt.Sprintf("You're invited to join %s on LeadFlow", tenantName),
		Html:    html,
	}
	client.Emails.Send(params)
}

// ── Update role ───────────────────────────────────────────────────────────────

type UpdateRoleRequest struct {
	Role string `json:"role" validate:"required"`
}

// PATCH /api/v1/team/members/:id/role  (owner only)
func (h *TeamHandler) UpdateRole(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)
	id, _ := strconv.Atoi(c.Param("id"))

	var req UpdateRoleRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}
	newRole := model.Role(req.Role)
	if newRole != model.RoleOwner && newRole != model.RoleMember {
		return echo.NewHTTPError(http.StatusBadRequest, "role must be 'owner' or 'member'")
	}

	var member model.User
	if err := h.DB.Where("id = ? AND tenant_id = ?", id, tenantID).First(&member).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "member not found")
	}

	if member.Role == model.RoleOwner && newRole != model.RoleOwner {
		var ownerCount int64
		h.DB.Model(&model.User{}).Where("tenant_id = ? AND role = ?", tenantID, model.RoleOwner).Count(&ownerCount)
		if ownerCount <= 1 {
			return echo.NewHTTPError(http.StatusBadRequest, "cannot demote the last owner")
		}
	}

	member.Role = newRole
	if err := h.DB.Save(&member).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to update role")
	}
	return c.JSON(http.StatusOK, member)
}

// ── Remove ────────────────────────────────────────────────────────────────────

// DELETE /api/v1/team/members/:id  (owner only)
func (h *TeamHandler) Remove(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)
	requesterID := c.Get("user_id").(uint)
	id, _ := strconv.Atoi(c.Param("id"))

	if uint(id) == requesterID {
		return echo.NewHTTPError(http.StatusBadRequest, "you cannot remove yourself")
	}

	var member model.User
	if err := h.DB.Where("id = ? AND tenant_id = ?", id, tenantID).First(&member).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "member not found")
	}

	if member.Role == model.RoleOwner {
		var ownerCount int64
		h.DB.Model(&model.User{}).Where("tenant_id = ? AND role = ?", tenantID, model.RoleOwner).Count(&ownerCount)
		if ownerCount <= 1 {
			return echo.NewHTTPError(http.StatusBadRequest, "cannot remove the last owner")
		}
	}

	var leadCount, taskCount int64
	h.DB.Model(&model.Lead{}).Where("tenant_id = ? AND owner_id = ?", tenantID, id).Count(&leadCount)
	h.DB.Model(&model.Task{}).Where("tenant_id = ? AND owner_id = ?", tenantID, id).Count(&taskCount)
	if leadCount > 0 || taskCount > 0 {
		return echo.NewHTTPError(http.StatusConflict, map[string]interface{}{
			"message": "this member still owns leads or tasks — reassign them first",
			"leads":   leadCount,
			"tasks":   taskCount,
		})
	}

	if err := h.DB.Delete(&member).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to remove member")
	}
	return c.JSON(http.StatusOK, echo.Map{"message": "member removed"})
}
