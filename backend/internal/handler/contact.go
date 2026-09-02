package handler

import (
	"encoding/csv"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/dhavi/leadflow/internal/model"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type ContactHandler struct {
	DB *gorm.DB
}

func (h *ContactHandler) checkCSVPlan(c echo.Context) (model.Tenant, error) {
	tenantID := c.Get("tenant_id").(uint)

	var tenant model.Tenant
	if err := h.DB.First(&tenant, tenantID).Error; err != nil {
		return tenant, echo.NewHTTPError(http.StatusNotFound, "tenant not found")
	}
	if !model.Limits[tenant.Plan].CSVExport {
		return tenant, echo.NewHTTPError(http.StatusForbidden, map[string]interface{}{
			"message": "CSV import/export is not available on your plan",
			"plan":    tenant.Plan,
		})
	}
	return tenant, nil
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

// GET /api/v1/contacts/export
func (h *ContactHandler) Export(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)

	if _, err := h.checkCSVPlan(c); err != nil {
		return err
	}

	var contacts []model.Contact
	if err := h.DB.Where("tenant_id = ?", tenantID).Order("created_at asc").Find(&contacts).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to fetch contacts")
	}

	c.Response().Header().Set(echo.HeaderContentType, "text/csv")
	c.Response().Header().Set(echo.HeaderContentDisposition, `attachment; filename="contacts.csv"`)
	c.Response().WriteHeader(http.StatusOK)

	w := csv.NewWriter(c.Response())
	w.Write([]string{"name", "email", "phone", "company", "notes", "created_at"})
	for _, ct := range contacts {
		w.Write([]string{
			ct.Name, ct.Email, ct.Phone, ct.Company, ct.Notes,
			ct.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		})
	}
	w.Flush()
	return w.Error()
}

// POST /api/v1/contacts/import  (multipart form, field "file")
func (h *ContactHandler) Import(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)

	if _, err := h.checkCSVPlan(c); err != nil {
		return err
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "file is required")
	}
	file, err := fileHeader.Open()
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "failed to read file")
	}
	defer file.Close()

	reader := csv.NewReader(file)
	reader.TrimLeadingSpace = true
	header, err := reader.Read()
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "empty or invalid CSV file")
	}

	col := map[string]int{}
	for i, name := range header {
		col[strings.ToLower(strings.TrimSpace(name))] = i
	}
	nameIdx, ok := col["name"]
	if !ok {
		return echo.NewHTTPError(http.StatusBadRequest, "CSV must have a 'name' column")
	}
	emailIdx, hasEmail := col["email"]
	phoneIdx, hasPhone := col["phone"]
	companyIdx, hasCompany := col["company"]
	notesIdx, hasNotes := col["notes"]

	var existing []model.Contact
	h.DB.Where("tenant_id = ?", tenantID).Find(&existing)
	byEmail := map[string]bool{}
	for _, ct := range existing {
		if ct.Email != "" {
			byEmail[strings.ToLower(ct.Email)] = true
		}
	}

	summary := ImportSummary{Errors: []ImportRowError{}}
	get := func(record []string, idx int, has bool) string {
		if !has || idx >= len(record) {
			return ""
		}
		return strings.TrimSpace(record[idx])
	}

	rowNum := 1
	for {
		record, rerr := reader.Read()
		if rerr == io.EOF {
			break
		}
		rowNum++
		if rerr != nil {
			summary.Failed++
			summary.Errors = append(summary.Errors, ImportRowError{Row: rowNum, Reason: "could not parse row"})
			continue
		}

		name := get(record, nameIdx, true)
		if name == "" {
			summary.Failed++
			summary.Errors = append(summary.Errors, ImportRowError{Row: rowNum, Reason: "name is required"})
			continue
		}

		email := strings.ToLower(get(record, emailIdx, hasEmail))
		if email != "" && !isValidEmail(email) {
			summary.Failed++
			summary.Errors = append(summary.Errors, ImportRowError{Row: rowNum, Reason: "invalid email"})
			continue
		}
		if email != "" && byEmail[email] {
			summary.Skipped++
			summary.Errors = append(summary.Errors, ImportRowError{Row: rowNum, Reason: "duplicate: a contact with this email already exists"})
			continue
		}

		contact := model.Contact{
			TenantID: tenantID,
			Name:     name,
			Email:    email,
			Phone:    get(record, phoneIdx, hasPhone),
			Company:  get(record, companyIdx, hasCompany),
			Notes:    get(record, notesIdx, hasNotes),
		}
		if err := h.DB.Create(&contact).Error; err != nil {
			summary.Failed++
			summary.Errors = append(summary.Errors, ImportRowError{Row: rowNum, Reason: "failed to save row"})
			continue
		}

		if email != "" {
			byEmail[email] = true
		}
		summary.Imported++
	}

	return c.JSON(http.StatusOK, summary)
}
