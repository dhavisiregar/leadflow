package handler

import (
	"crypto/sha512"
	"fmt"
	"net/http"
	"strings"

	"github.com/dhavi/leadflow/internal/model"
	"github.com/labstack/echo/v4"
	midtrans "github.com/midtrans/midtrans-go"
	"github.com/midtrans/midtrans-go/coreapi"
	"github.com/midtrans/midtrans-go/snap"
	"gorm.io/gorm"
)

type PaymentHandler struct {
	DB         *gorm.DB
	ServerKey  string
	ClientKey  string
	Production bool
}

var planPrices = map[model.Plan]int64{
	model.PlanStarter: 99000,
	model.PlanPro:     249000,
	model.PlanTeam:    599000,
}

var planNames = map[model.Plan]string{
	model.PlanStarter: "LeadFlow Starter",
	model.PlanPro:     "LeadFlow Pro",
	model.PlanTeam:    "LeadFlow Team",
}

// POST /api/v1/payment/create
func (h *PaymentHandler) Create(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)
	userID := c.Get("user_id").(uint)

	var body struct {
		Plan string `json:"plan"`
	}
	if err := c.Bind(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	targetPlan := model.Plan(body.Plan)
	price, ok := planPrices[targetPlan]
	if !ok {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid plan")
	}

	var tenant model.Tenant
	if err := h.DB.First(&tenant, tenantID).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "tenant not found")
	}

	var user model.User
	if err := h.DB.First(&user, userID).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "user not found")
	}

	orderID := fmt.Sprintf("leadflow-%d-%s-%d", tenantID, targetPlan, tenantID*1000+uint(price))

	env := midtrans.Sandbox
	if h.Production {
		env = midtrans.Production
	}

	snapClient := snap.Client{}
	snapClient.New(h.ServerKey, env)

	req := &snap.Request{
		TransactionDetails: midtrans.TransactionDetails{
			OrderID:  orderID,
			GrossAmt: price,
		},
		Items: &[]midtrans.ItemDetails{
			{
				ID:    string(targetPlan),
				Name:  planNames[targetPlan],
				Price: price,
				Qty:   1,
			},
		},
		CustomerDetail: &midtrans.CustomerDetails{
			FName: user.Name,
			Email: user.Email,
		},
		CustomField1: fmt.Sprintf("%d", tenantID),
		CustomField2: string(targetPlan),
	}

	snapResp, err := snapClient.CreateTransaction(req)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to create payment")
	}

	return c.JSON(http.StatusOK, echo.Map{
		"snap_token": snapResp.Token,
		"client_key": h.ClientKey,
		"order_id":   orderID,
	})
}

// POST /api/v1/payment/verify  (protected — called by frontend after Snap onSuccess)
func (h *PaymentHandler) Verify(c echo.Context) error {
	tenantID := c.Get("tenant_id").(uint)

	var body struct {
		OrderID string `json:"order_id"`
	}
	if err := c.Bind(&body); err != nil || body.OrderID == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "order_id is required")
	}

	env := midtrans.Sandbox
	if h.Production {
		env = midtrans.Production
	}

	coreClient := coreapi.Client{}
	coreClient.New(h.ServerKey, env)

	result, err := coreClient.CheckTransaction(body.OrderID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "transaction not found")
	}

	if result.TransactionStatus != "settlement" && result.TransactionStatus != "capture" {
		return echo.NewHTTPError(http.StatusPaymentRequired, "payment not completed")
	}
	if result.FraudStatus == "deny" {
		return echo.NewHTTPError(http.StatusForbidden, "payment flagged as fraud")
	}

	// Verify this order belongs to the authenticated tenant
	var orderTenantID uint
	fmt.Sscanf(result.CustomField1, "%d", &orderTenantID)
	if orderTenantID != tenantID {
		return echo.NewHTTPError(http.StatusForbidden, "order does not belong to this tenant")
	}

	targetPlan := model.Plan(result.CustomField2)
	if _, valid := planPrices[targetPlan]; !valid {
		return echo.NewHTTPError(http.StatusBadRequest, "unknown plan in order")
	}

	if err := h.DB.Model(&model.Tenant{}).Where("id = ?", tenantID).Update("plan", targetPlan).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to update plan")
	}

	return c.JSON(http.StatusOK, echo.Map{"message": "plan updated", "plan": targetPlan})
}

// POST /api/v1/payment/webhook  (public — called by Midtrans)
func (h *PaymentHandler) Webhook(c echo.Context) error {
	var notif struct {
		OrderID           string `json:"order_id"`
		StatusCode        string `json:"status_code"`
		GrossAmount       string `json:"gross_amount"`
		SignatureKey      string `json:"signature_key"`
		TransactionStatus string `json:"transaction_status"`
		FraudStatus       string `json:"fraud_status"`
		CustomField1      string `json:"custom_field1"`
		CustomField2      string `json:"custom_field2"`
	}
	if err := c.Bind(&notif); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
	}

	// Verify signature: sha512(order_id + status_code + gross_amount + server_key)
	raw := notif.OrderID + notif.StatusCode + notif.GrossAmount + h.ServerKey
	hash := fmt.Sprintf("%x", sha512.Sum512([]byte(raw)))
	if !strings.EqualFold(hash, notif.SignatureKey) {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid signature")
	}

	// Only process on settlement or capture
	if notif.TransactionStatus != "settlement" && notif.TransactionStatus != "capture" {
		return c.JSON(http.StatusOK, echo.Map{"message": "ignored"})
	}
	if notif.FraudStatus == "deny" {
		return c.JSON(http.StatusOK, echo.Map{"message": "fraud denied"})
	}

	targetPlan := model.Plan(notif.CustomField2)
	if _, valid := planPrices[targetPlan]; !valid {
		return echo.NewHTTPError(http.StatusBadRequest, "unknown plan")
	}

	var tenantID uint
	fmt.Sscanf(notif.CustomField1, "%d", &tenantID)
	if tenantID == 0 {
		return echo.NewHTTPError(http.StatusBadRequest, "missing tenant")
	}

	if err := h.DB.Model(&model.Tenant{}).Where("id = ?", tenantID).Update("plan", targetPlan).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to update plan")
	}

	return c.JSON(http.StatusOK, echo.Map{"message": "plan updated"})
}
