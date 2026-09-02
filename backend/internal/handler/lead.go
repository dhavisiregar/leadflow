package handler

import (
	"encoding/csv"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/dhavi/leadflow/internal/model"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type LeadHandler struct {
	DB *gorm.DB
}

// GET /api/v1/leads
func (h *LeadHandler) List(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)

	var leads []model.Lead
	query := h.DB.Where("tenant_id = ?", tenantID).
		Preload("Contact").
		Preload("Stage").
		Preload("Owner")

	// Optional filter by stage
	if stageID := c.QueryParam("stage_id"); stageID != "" {
		query = query.Where("stage_id = ?", stageID)
	}

	if err := query.Find(&leads).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to fetch leads")
	}
	return c.JSON(http.StatusOK, leads)
}

// GET /api/v1/leads/:id
func (h *LeadHandler) Get(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)
	id, _ := strconv.Atoi(c.Param("id"))

	var tenant model.Tenant
	if err := h.DB.First(&tenant, tenantID).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "tenant not found")
	}

	if !model.Limits[tenant.Plan].LeadDetailPage {
		return echo.NewHTTPError(http.StatusForbidden, map[string]interface{}{
			"message": "lead detail page is not available on your plan",
			"plan":    tenant.Plan,
		})
	}

	var lead model.Lead
	if err := h.DB.Where("id = ? AND tenant_id = ?", id, tenantID).
		Preload("Contact").Preload("Stage").Preload("Owner").
		First(&lead).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "lead not found")
	}
	return c.JSON(http.StatusOK, lead)
}

// POST /api/v1/leads
func (h *LeadHandler) Create(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)
	ownerID := c.Get("user_id").(uint)

	var tenant model.Tenant
	h.DB.First(&tenant, tenantID)
	if !tenant.CanAddLead() {
		l := model.Limits[tenant.Plan]
		return echo.NewHTTPError(http.StatusPaymentRequired, map[string]interface{}{
			"message": "lead limit reached. Please upgrade.",
			"limit":   l.MaxLeads,
			"plan":    tenant.Plan,
		})
	}

	var lead model.Lead
	if err := c.Bind(&lead); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	lead.TenantID = tenantID
	lead.OwnerID = ownerID

	if err := h.DB.Create(&lead).Error; err != nil {
		log.Printf("create lead error: %v | lead: %+v", err, lead)
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to create lead")
	}

	// Increment tenant leads_count
	h.DB.Model(&tenant).UpdateColumn("leads_count", gorm.Expr("leads_count + 1"))

	return c.JSON(http.StatusCreated, lead)
}

// PUT /api/v1/leads/:id
func (h *LeadHandler) Update(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)
	id, _ := strconv.Atoi(c.Param("id"))

	var lead model.Lead
	if err := h.DB.Where("id = ? AND tenant_id = ?", id, tenantID).First(&lead).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "lead not found")
	}

	originalOwnerID := lead.OwnerID

	if err := c.Bind(&lead); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	// Protect immutable fields — ownership can only change via the dedicated
	// /assign endpoint, which validates the new owner belongs to the tenant.
	lead.ID = uint(id)
	lead.TenantID = tenantID
	lead.OwnerID = originalOwnerID

	if err := h.DB.Save(&lead).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to update lead")
	}
	return c.JSON(http.StatusOK, lead)
}

// PATCH /api/v1/leads/:id/assign
func (h *LeadHandler) Assign(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)
	id, _ := strconv.Atoi(c.Param("id"))

	var body struct {
		OwnerID uint `json:"owner_id"`
	}
	if err := c.Bind(&body); err != nil || body.OwnerID == 0 {
		return echo.NewHTTPError(http.StatusBadRequest, "owner_id is required")
	}

	// New owner must belong to the same tenant.
	var owner model.User
	if err := h.DB.Where("id = ? AND tenant_id = ?", body.OwnerID, tenantID).First(&owner).Error; err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid owner")
	}

	result := h.DB.Model(&model.Lead{}).
		Where("id = ? AND tenant_id = ?", id, tenantID).
		Update("owner_id", body.OwnerID)

	if result.RowsAffected == 0 {
		return echo.NewHTTPError(http.StatusNotFound, "lead not found")
	}
	return c.JSON(http.StatusOK, echo.Map{"message": "lead reassigned", "owner_id": body.OwnerID})
}

// PATCH /api/v1/leads/:id/stage
func (h *LeadHandler) MoveStage(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)
	id, _ := strconv.Atoi(c.Param("id"))

	var body struct {
		StageID     uint   `json:"stage_id"`
		CloseReason string `json:"close_reason"`
		CloseNote   string `json:"close_note"`
	}
	if err := c.Bind(&body); err != nil || body.StageID == 0 {
		return echo.NewHTTPError(http.StatusBadRequest, "stage_id is required")
	}

	// Verify stage belongs to same tenant
	var stage model.Stage
	if err := h.DB.Where("id = ? AND tenant_id = ?", body.StageID, tenantID).First(&stage).Error; err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid stage")
	}

	if (stage.Name == "Won" || stage.Name == "Lost") && body.CloseReason == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "close_reason is required for Won/Lost stages")
	}

	updates := map[string]interface{}{"stage_id": body.StageID}
	if body.CloseReason != "" {
		updates["close_reason"] = body.CloseReason
		updates["close_note"] = body.CloseNote
	}

	result := h.DB.Model(&model.Lead{}).
		Where("id = ? AND tenant_id = ?", id, tenantID).
		Updates(updates)

	if result.RowsAffected == 0 {
		return echo.NewHTTPError(http.StatusNotFound, "lead not found")
	}
	return c.JSON(http.StatusOK, echo.Map{"message": "stage updated", "stage_id": body.StageID})
}

// DELETE /api/v1/leads/:id
func (h *LeadHandler) Delete(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)
	id, _ := strconv.Atoi(c.Param("id"))

	result := h.DB.Where("id = ? AND tenant_id = ?", id, tenantID).Delete(&model.Lead{})
	if result.RowsAffected == 0 {
		return echo.NewHTTPError(http.StatusNotFound, "lead not found")
	}

	// Decrement leads_count
	h.DB.Model(&model.Tenant{}).Where("id = ?", tenantID).
		UpdateColumn("leads_count", gorm.Expr("leads_count - 1"))

	return c.JSON(http.StatusOK, echo.Map{"message": "lead deleted"})
}

func (h *LeadHandler) checkCSVPlan(c echo.Context) (model.Tenant, error) {
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

// GET /api/v1/leads/export
func (h *LeadHandler) Export(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)

	if _, err := h.checkCSVPlan(c); err != nil {
		return err
	}

	var leads []model.Lead
	if err := h.DB.Where("tenant_id = ?", tenantID).
		Preload("Contact").Preload("Stage").Preload("Owner").
		Order("created_at asc").Find(&leads).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to fetch leads")
	}

	c.Response().Header().Set(echo.HeaderContentType, "text/csv")
	c.Response().Header().Set(echo.HeaderContentDisposition, `attachment; filename="leads.csv"`)
	c.Response().WriteHeader(http.StatusOK)

	w := csv.NewWriter(c.Response())
	w.Write([]string{"title", "value", "stage", "contact_name", "contact_email", "owner_name", "owner_email", "notes", "close_reason", "close_note", "created_at"})
	for _, l := range leads {
		stageName, contactName, contactEmail, ownerName, ownerEmail := "", "", "", "", ""
		if l.Stage != nil {
			stageName = l.Stage.Name
		}
		if l.Contact != nil {
			contactName, contactEmail = l.Contact.Name, l.Contact.Email
		}
		if l.Owner != nil {
			ownerName, ownerEmail = l.Owner.Name, l.Owner.Email
		}
		w.Write([]string{
			l.Title,
			strconv.FormatFloat(l.Value, 'f', 2, 64),
			stageName, contactName, contactEmail, ownerName, ownerEmail,
			l.Notes, l.CloseReason, l.CloseNote,
			l.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		})
	}
	w.Flush()
	return w.Error()
}

// POST /api/v1/leads/import  (multipart form, field "file")
// CSV columns: title (required), value, stage, contact_email, notes.
// `stage` must match one of the tenant's pipeline stage names (case-insensitive);
// left blank it defaults to the first stage. `contact_email`, if it doesn't
// match an existing contact, is left unlinked rather than failing the row.
func (h *LeadHandler) Import(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)
	ownerID := c.Get("user_id").(uint)

	tenant, err := h.checkCSVPlan(c)
	if err != nil {
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
	titleIdx, ok := col["title"]
	if !ok {
		return echo.NewHTTPError(http.StatusBadRequest, "CSV must have a 'title' column")
	}
	valueIdx, hasValue := col["value"]
	stageIdx, hasStage := col["stage"]
	contactEmailIdx, hasContactEmail := col["contact_email"]
	notesIdx, hasNotes := col["notes"]

	var stages []model.Stage
	h.DB.Where("tenant_id = ?", tenantID).Order(`"order" asc`).Find(&stages)
	if len(stages) == 0 {
		return echo.NewHTTPError(http.StatusBadRequest, "no pipeline stages configured for this tenant")
	}
	stageByName := map[string]model.Stage{}
	for _, s := range stages {
		stageByName[strings.ToLower(s.Name)] = s
	}
	defaultStage := stages[0]

	var contacts []model.Contact
	h.DB.Where("tenant_id = ?", tenantID).Find(&contacts)
	contactByEmail := map[string]model.Contact{}
	for _, ct := range contacts {
		if ct.Email != "" {
			contactByEmail[strings.ToLower(ct.Email)] = ct
		}
	}

	var existingLeads []model.Lead
	h.DB.Where("tenant_id = ?", tenantID).Find(&existingLeads)
	existingTitles := map[string]bool{}
	for _, l := range existingLeads {
		existingTitles[strings.ToLower(strings.TrimSpace(l.Title))] = true
	}

	limit := model.Limits[tenant.Plan].MaxLeads
	count := tenant.LeadsCount

	get := func(record []string, idx int, has bool) string {
		if !has || idx >= len(record) {
			return ""
		}
		return strings.TrimSpace(record[idx])
	}

	summary := ImportSummary{Errors: []ImportRowError{}}
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

		title := get(record, titleIdx, true)
		if title == "" {
			summary.Failed++
			summary.Errors = append(summary.Errors, ImportRowError{Row: rowNum, Reason: "title is required"})
			continue
		}
		if existingTitles[strings.ToLower(title)] {
			summary.Skipped++
			summary.Errors = append(summary.Errors, ImportRowError{Row: rowNum, Reason: "duplicate: a lead with this title already exists"})
			continue
		}
		if limit != -1 && count >= limit {
			summary.Failed++
			summary.Errors = append(summary.Errors, ImportRowError{Row: rowNum, Reason: "lead limit reached for your plan"})
			continue
		}

		lead := model.Lead{TenantID: tenantID, OwnerID: ownerID, Title: title, StageID: defaultStage.ID}

		if v := get(record, valueIdx, hasValue); v != "" {
			f, verr := strconv.ParseFloat(v, 64)
			if verr != nil {
				summary.Failed++
				summary.Errors = append(summary.Errors, ImportRowError{Row: rowNum, Reason: "invalid value: must be a number"})
				continue
			}
			lead.Value = f
		}

		if s := get(record, stageIdx, hasStage); s != "" {
			stage, ok := stageByName[strings.ToLower(s)]
			if !ok {
				summary.Failed++
				summary.Errors = append(summary.Errors, ImportRowError{Row: rowNum, Reason: "unknown stage: " + s})
				continue
			}
			lead.StageID = stage.ID
		}

		if email := strings.ToLower(get(record, contactEmailIdx, hasContactEmail)); email != "" {
			if ct, ok := contactByEmail[email]; ok {
				cid := ct.ID
				lead.ContactID = &cid
			}
		}

		lead.Notes = get(record, notesIdx, hasNotes)

		if err := h.DB.Create(&lead).Error; err != nil {
			summary.Failed++
			summary.Errors = append(summary.Errors, ImportRowError{Row: rowNum, Reason: "failed to save row"})
			continue
		}

		existingTitles[strings.ToLower(title)] = true
		count++
		summary.Imported++
	}

	if summary.Imported > 0 {
		h.DB.Model(&model.Tenant{}).Where("id = ?", tenantID).
			UpdateColumn("leads_count", gorm.Expr("leads_count + ?", summary.Imported))
	}

	return c.JSON(http.StatusOK, summary)
}
