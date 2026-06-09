package handler

import (
	"net/http"
	"strconv"

	"github.com/dhavi/leadflow/internal/model"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type ContactHandler struct {
	DB *gorm.DB
}

// GET /api/v1/contacts
func (h *ContactHandler) List(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)
	var contacts []model.Contact
	if err := h.DB.Where("tenant_id = ?", tenantID).Find(&contacts).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to fetch contacts")
	}
	return c.JSON(http.StatusOK, contacts)
}

// GET /api/v1/contacts/:id
func (h *ContactHandler) Get(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)
	id, _ := strconv.Atoi(c.Param("id"))

	var contact model.Contact
	if err := h.DB.Where("id = ? AND tenant_id = ?", id, tenantID).First(&contact).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "contact not found")
	}
	return c.JSON(http.StatusOK, contact)
}

// POST /api/v1/contacts
func (h *ContactHandler) Create(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)

	var contact model.Contact
	if err := c.Bind(&contact); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}
	contact.TenantID = tenantID

	if err := h.DB.Create(&contact).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to create contact")
	}
	return c.JSON(http.StatusCreated, contact)
}

// PUT /api/v1/contacts/:id
func (h *ContactHandler) Update(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)
	id, _ := strconv.Atoi(c.Param("id"))

	var contact model.Contact
	if err := h.DB.Where("id = ? AND tenant_id = ?", id, tenantID).First(&contact).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "contact not found")
	}
	if err := c.Bind(&contact); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}
	contact.ID = uint(id)
	contact.TenantID = tenantID

	if err := h.DB.Save(&contact).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to update contact")
	}
	return c.JSON(http.StatusOK, contact)
}

// DELETE /api/v1/contacts/:id
func (h *ContactHandler) Delete(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)
	id, _ := strconv.Atoi(c.Param("id"))

	result := h.DB.Where("id = ? AND tenant_id = ?", id, tenantID).Delete(&model.Contact{})
	if result.RowsAffected == 0 {
		return echo.NewHTTPError(http.StatusNotFound, "contact not found")
	}
	return c.JSON(http.StatusOK, echo.Map{"message": "contact deleted"})
}
