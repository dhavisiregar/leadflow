package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/dhavi/leadflow/internal/model"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type TaskHandler struct {
	DB *gorm.DB
}

type TaskGroup struct {
	Lead  *model.Lead  `json:"lead"`
	Tasks []model.Task `json:"tasks"`
}

// GET /api/v1/tasks
func (h *TaskHandler) List(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)

	var tenant model.Tenant
	if err := h.DB.First(&tenant, tenantID).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "tenant not found")
	}

	if !model.Limits[tenant.Plan].Tasks {
		return echo.NewHTTPError(http.StatusForbidden, map[string]interface{}{
			"message": "tasks feature is not available on your plan",
			"plan":    tenant.Plan,
		})
	}

	query := h.DB.Where("tasks.tenant_id = ?", tenantID).
		Preload("Lead.Stage").
		Preload("Owner").
		Order("is_completed asc, due_date asc, created_at desc")

	// filter param
	filter := c.QueryParam("filter")
	today := time.Now().Format("2006-01-02")
	switch filter {
	case "today":
		query = query.Where("DATE(due_date) = ?", today)
	case "overdue":
		query = query.Where("due_date < ? AND is_completed = false", today)
	case "completed":
		query = query.Where("is_completed = true")
	// "all" or empty: no additional filter
	}

	// legacy params still supported
	if v := c.QueryParam("is_completed"); v != "" && filter == "" {
		query = query.Where("is_completed = ?", v == "true")
	}
	if v := c.QueryParam("lead_id"); v != "" {
		query = query.Where("lead_id = ?", v)
	}

	var tasks []model.Task
	if err := query.Find(&tasks).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to fetch tasks")
	}

	// group_by=lead
	if c.QueryParam("group_by") == "lead" {
		groupMap := map[uint]*TaskGroup{}
		var order []uint
		var noLeadGroup *TaskGroup

		for i := range tasks {
			t := tasks[i]
			if t.LeadID == nil {
				if noLeadGroup == nil {
					noLeadGroup = &TaskGroup{Lead: nil, Tasks: []model.Task{}}
				}
				noLeadGroup.Tasks = append(noLeadGroup.Tasks, t)
			} else {
				key := *t.LeadID
				if _, ok := groupMap[key]; !ok {
					groupMap[key] = &TaskGroup{Lead: t.Lead, Tasks: []model.Task{}}
					order = append(order, key)
				}
				groupMap[key].Tasks = append(groupMap[key].Tasks, t)
			}
		}

		result := make([]TaskGroup, 0, len(groupMap)+1)
		for _, k := range order {
			result = append(result, *groupMap[k])
		}
		if noLeadGroup != nil {
			result = append(result, *noLeadGroup)
		}
		return c.JSON(http.StatusOK, result)
	}

	return c.JSON(http.StatusOK, tasks)
}

// POST /api/v1/tasks
func (h *TaskHandler) Create(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)
	ownerID := c.Get("user_id").(uint)

	var tenant model.Tenant
	if err := h.DB.First(&tenant, tenantID).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "tenant not found")
	}

	if !model.Limits[tenant.Plan].Tasks {
		return echo.NewHTTPError(http.StatusForbidden, map[string]interface{}{
			"message": "tasks feature is not available on your plan",
			"plan":    tenant.Plan,
		})
	}

	var task model.Task
	if err := c.Bind(&task); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}
	task.TenantID = tenantID
	task.OwnerID = ownerID
	if task.Priority == "" {
		task.Priority = "medium"
	}

	if err := h.DB.Create(&task).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to create task")
	}

	h.DB.Preload("Lead.Stage").Preload("Owner").First(&task, task.ID)
	return c.JSON(http.StatusCreated, task)
}

// PATCH /api/v1/tasks/:id/complete
func (h *TaskHandler) Complete(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)

	var tenant model.Tenant
	if err := h.DB.First(&tenant, tenantID).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "tenant not found")
	}

	if !model.Limits[tenant.Plan].Tasks {
		return echo.NewHTTPError(http.StatusForbidden, map[string]interface{}{
			"message": "tasks feature is not available on your plan",
			"plan":    tenant.Plan,
		})
	}

	id, _ := strconv.Atoi(c.Param("id"))

	var task model.Task
	if err := h.DB.Where("id = ? AND tenant_id = ?", id, tenantID).First(&task).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "task not found")
	}

	task.IsCompleted = !task.IsCompleted
	h.DB.Save(&task)
	h.DB.Preload("Lead.Stage").Preload("Owner").First(&task, task.ID)
	return c.JSON(http.StatusOK, task)
}

// PUT /api/v1/tasks/:id
func (h *TaskHandler) Update(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)

	var tenant model.Tenant
	if err := h.DB.First(&tenant, tenantID).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "tenant not found")
	}

	if !model.Limits[tenant.Plan].Tasks {
		return echo.NewHTTPError(http.StatusForbidden, map[string]interface{}{
			"message": "tasks feature is not available on your plan",
			"plan":    tenant.Plan,
		})
	}

	id, _ := strconv.Atoi(c.Param("id"))

	var task model.Task
	if err := h.DB.Where("id = ? AND tenant_id = ?", id, tenantID).First(&task).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "task not found")
	}

	var body struct {
		Title    string  `json:"title"`
		Priority string  `json:"priority"`
		DueDate  *string `json:"due_date"`
		LeadID   *uint   `json:"lead_id"`
	}
	if err := c.Bind(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	if body.Title != "" {
		task.Title = body.Title
	}
	if body.Priority != "" {
		task.Priority = body.Priority
	}
	if body.DueDate != nil {
		if *body.DueDate == "" {
			task.DueDate = nil
		} else {
			t, err := time.Parse(time.RFC3339, *body.DueDate)
			if err == nil {
				task.DueDate = &t
			}
		}
	}
	task.LeadID = body.LeadID

	h.DB.Save(&task)
	h.DB.Preload("Lead.Stage").Preload("Owner").First(&task, task.ID)
	return c.JSON(http.StatusOK, task)
}

// DELETE /api/v1/tasks/:id
func (h *TaskHandler) Delete(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)

	var tenant model.Tenant
	if err := h.DB.First(&tenant, tenantID).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "tenant not found")
	}

	if !model.Limits[tenant.Plan].Tasks {
		return echo.NewHTTPError(http.StatusForbidden, map[string]interface{}{
			"message": "tasks feature is not available on your plan",
			"plan":    tenant.Plan,
		})
	}

	id, _ := strconv.Atoi(c.Param("id"))

	result := h.DB.Where("id = ? AND tenant_id = ?", id, tenantID).Delete(&model.Task{})
	if result.RowsAffected == 0 {
		return echo.NewHTTPError(http.StatusNotFound, "task not found")
	}
	return c.JSON(http.StatusOK, echo.Map{"message": "task deleted"})
}
