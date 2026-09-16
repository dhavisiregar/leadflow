package handler

import (
	"net/http"
	"strconv"

	"github.com/dhavi/leadflow/internal/model"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type TeamHandler struct {
	DB *gorm.DB
}

// GET /api/v1/teams
func (h *TeamHandler) List(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)

	var teams []model.Team
	if err := h.DB.Where("tenant_id = ?", tenantID).
		Preload("Manager").Preload("UnitHead").
		Order("name asc").Find(&teams).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to fetch teams")
	}

	// Attach member (Sales) users per team.
	type teamOut struct {
		model.Team
		Members []model.User `json:"members"`
	}
	out := make([]teamOut, 0, len(teams))
	for _, t := range teams {
		var members []model.User
		h.DB.Where("tenant_id = ? AND team_id = ?", tenantID, t.ID).Find(&members)
		out = append(out, teamOut{Team: t, Members: members})
	}

	return c.JSON(http.StatusOK, out)
}

type teamRequest struct {
	Name       string `json:"name"`
	ManagerID  *uint  `json:"manager_id"`
	UnitHeadID *uint  `json:"unit_head_id"`
	MemberIDs  []uint `json:"member_ids"`
}

func (h *TeamHandler) applyMembers(tenantID uint, teamID uint, memberIDs []uint) error {
	// Clear anyone previously on this team but no longer selected.
	if err := h.DB.Model(&model.User{}).
		Where("tenant_id = ? AND team_id = ?", tenantID, teamID).
		Update("team_id", nil).Error; err != nil {
		return err
	}
	if len(memberIDs) == 0 {
		return nil
	}
	return h.DB.Model(&model.User{}).
		Where("tenant_id = ? AND id IN ? AND role = ?", tenantID, memberIDs, model.RoleSales).
		Update("team_id", teamID).Error
}

// POST /api/v1/teams
func (h *TeamHandler) Create(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)

	var req teamRequest
	if err := c.Bind(&req); err != nil || req.Name == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "name is required")
	}

	team := model.Team{TenantID: tenantID, Name: req.Name, ManagerID: req.ManagerID, UnitHeadID: req.UnitHeadID}
	if err := h.DB.Create(&team).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to create team")
	}
	if err := h.applyMembers(tenantID, team.ID, req.MemberIDs); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to assign members")
	}

	h.DB.Preload("Manager").Preload("UnitHead").First(&team, team.ID)
	return c.JSON(http.StatusCreated, team)
}

// PUT /api/v1/teams/:id
func (h *TeamHandler) Update(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)
	id, _ := strconv.Atoi(c.Param("id"))

	var team model.Team
	if err := h.DB.Where("id = ? AND tenant_id = ?", id, tenantID).First(&team).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "team not found")
	}

	var req teamRequest
	if err := c.Bind(&req); err != nil || req.Name == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "name is required")
	}

	if err := h.DB.Model(&team).Updates(map[string]interface{}{
		"name":         req.Name,
		"manager_id":   req.ManagerID,
		"unit_head_id": req.UnitHeadID,
	}).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to update team")
	}
	if err := h.applyMembers(tenantID, team.ID, req.MemberIDs); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to assign members")
	}

	h.DB.Preload("Manager").Preload("UnitHead").First(&team, team.ID)
	return c.JSON(http.StatusOK, team)
}

// DELETE /api/v1/teams/:id
func (h *TeamHandler) Delete(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)
	id, _ := strconv.Atoi(c.Param("id"))

	h.DB.Model(&model.User{}).Where("tenant_id = ? AND team_id = ?", tenantID, id).Update("team_id", nil)

	result := h.DB.Where("id = ? AND tenant_id = ?", id, tenantID).Delete(&model.Team{})
	if result.RowsAffected == 0 {
		return echo.NewHTTPError(http.StatusNotFound, "team not found")
	}
	return c.JSON(http.StatusOK, echo.Map{"message": "team deleted"})
}
