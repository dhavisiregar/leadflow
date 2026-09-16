package handler

import (
	"net/http"
	"strconv"

	"github.com/dhavi/leadflow/internal/model"
	"github.com/labstack/echo/v4"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type TeamMemberHandler struct {
	DB *gorm.DB
}

var assignableRoles = map[model.Role]bool{
	model.RoleSales:       true,
	model.RoleUnitHead:    true,
	model.RoleManager:     true,
	model.RoleDataAnalyst: true,
}

// GET /api/v1/team-members
func (h *TeamMemberHandler) List(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)

	var users []model.User
	if err := h.DB.Where("tenant_id = ?", tenantID).
		Preload("Team").Order("created_at asc").Find(&users).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to fetch team members")
	}
	return c.JSON(http.StatusOK, users)
}

type teamMemberRequest struct {
	Name     string     `json:"name"`
	Email    string     `json:"email"`
	Password string     `json:"password"`
	Role     model.Role `json:"role"`
	TeamID   *uint      `json:"team_id"`
}

// POST /api/v1/team-members
// Owner creates a new user directly inside their own tenant.
func (h *TeamMemberHandler) Create(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)

	var req teamMemberRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}
	if req.Name == "" || req.Email == "" || len(req.Password) < 8 {
		return echo.NewHTTPError(http.StatusBadRequest, "name, email, and a password of at least 8 characters are required")
	}
	if !assignableRoles[req.Role] {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid role")
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
			"message": "user limit reached. Please upgrade.",
			"limit":   l.MaxUsers,
			"plan":    tenant.Plan,
		})
	}

	var existing model.User
	if err := h.DB.Where("email = ?", req.Email).First(&existing).Error; err == nil {
		return echo.NewHTTPError(http.StatusConflict, "email already registered")
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to hash password")
	}

	user := model.User{
		TenantID: tenantID,
		Name:     req.Name,
		Email:    req.Email,
		Password: string(hashed),
		Role:     req.Role,
		TeamID:   req.TeamID,
	}
	if err := h.DB.Create(&user).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to create user")
	}

	h.DB.Preload("Team").First(&user, user.ID)
	return c.JSON(http.StatusCreated, user)
}

// PUT /api/v1/team-members/:id
func (h *TeamMemberHandler) Update(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)
	id, _ := strconv.Atoi(c.Param("id"))

	var user model.User
	if err := h.DB.Where("id = ? AND tenant_id = ?", id, tenantID).First(&user).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "team member not found")
	}

	var req teamMemberRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	updates := map[string]interface{}{}
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Role != "" {
		if !assignableRoles[req.Role] {
			return echo.NewHTTPError(http.StatusBadRequest, "invalid role")
		}
		updates["role"] = req.Role
	}
	updates["team_id"] = req.TeamID
	if req.Password != "" {
		if len(req.Password) < 8 {
			return echo.NewHTTPError(http.StatusBadRequest, "password must be at least 8 characters")
		}
		hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "failed to hash password")
		}
		updates["password"] = string(hashed)
	}

	if err := h.DB.Model(&user).Updates(updates).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to update team member")
	}

	h.DB.Preload("Team").First(&user, user.ID)
	return c.JSON(http.StatusOK, user)
}

// DELETE /api/v1/team-members/:id
func (h *TeamMemberHandler) Delete(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)
	callerID := c.Get("user_id").(uint)
	id, _ := strconv.Atoi(c.Param("id"))

	if uint(id) == callerID {
		return echo.NewHTTPError(http.StatusBadRequest, "cannot remove your own account")
	}

	// Release this user from any Team they lead/manage before removing them.
	h.DB.Model(&model.Team{}).Where("tenant_id = ? AND unit_head_id = ?", tenantID, id).Update("unit_head_id", nil)
	h.DB.Model(&model.Team{}).Where("tenant_id = ? AND manager_id = ?", tenantID, id).Update("manager_id", nil)

	result := h.DB.Where("id = ? AND tenant_id = ?", id, tenantID).Delete(&model.User{})
	if result.RowsAffected == 0 {
		return echo.NewHTTPError(http.StatusNotFound, "team member not found")
	}
	return c.JSON(http.StatusOK, echo.Map{"message": "team member removed"})
}
