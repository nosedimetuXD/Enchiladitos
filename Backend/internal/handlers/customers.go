package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/NosedimetuXD/cafeteria/internal/events"
	custommw "github.com/NosedimetuXD/cafeteria/internal/middleware"
	"github.com/NosedimetuXD/cafeteria/internal/models"
)

type CustomerHandler struct {
	DB  *pgxpool.Pool
	Hub *events.Hub
}

func NewCustomerHandler(db *pgxpool.Pool, hub *events.Hub) *CustomerHandler {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, _ = db.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS customers (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			first_name VARCHAR(100) NOT NULL,
			last_name VARCHAR(100) NOT NULL DEFAULT '',
			phone VARCHAR(30) DEFAULT '',
			email VARCHAR(150) DEFAULT '',
			notes TEXT DEFAULT '',
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
		);
		CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(first_name, last_name);
		CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

		CREATE TABLE IF NOT EXISTS customer_payments (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
			amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
			payment_method VARCHAR(50) NOT NULL DEFAULT 'efectivo',
			bank_details TEXT DEFAULT '',
			notes TEXT DEFAULT '',
			registered_by UUID REFERENCES users(id) ON DELETE SET NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now()
		);
		CREATE INDEX IF NOT EXISTS idx_customer_payments_customer_id ON customer_payments(customer_id);
	`)

	return &CustomerHandler{DB: db, Hub: hub}
}

func CalculateStampsInfo(totalPaidEligible float64, rewardsRedeemed int) models.CustomerStampsInfo {
	totalStamps := int(math.Floor(totalPaidEligible / 10000.0))
	totalRewards := totalStamps / 7
	availableRewards := totalRewards - rewardsRedeemed
	if availableRewards < 0 {
		availableRewards = 0
	}

	currentCycleStamps := totalStamps % 7
	progressPercent := (float64(currentCycleStamps) / 7.0) * 100.0

	amountPaidInCurrentStamp := math.Mod(totalPaidEligible, 10000.0)
	amountToNextStamp := 10000.0 - amountPaidInCurrentStamp
	if amountToNextStamp == 10000.0 && totalPaidEligible > 0 && amountPaidInCurrentStamp == 0 {
		amountToNextStamp = 10000.0
	}

	nextRewardTarget := float64(totalRewards+1) * 70000.0
	amountToNextReward := math.Max(0, nextRewardTarget-totalPaidEligible)

	return models.CustomerStampsInfo{
		TotalPaidEligible:  totalPaidEligible,
		TotalStampsEarned:  totalStamps,
		TotalRewardsEarned: totalRewards,
		RewardsRedeemed:    rewardsRedeemed,
		AvailableRewards:   availableRewards,
		HasRewardUnlocked:  availableRewards > 0,
		CurrentCycleStamps: currentCycleStamps,
		ProgressPercent:    math.Round(progressPercent*10) / 10,
		AmountToNextStamp:  amountToNextStamp,
		AmountToNextReward: amountToNextReward,
	}
}

// GET /customers
func (h *CustomerHandler) List(w http.ResponseWriter, r *http.Request) {
	search := strings.TrimSpace(r.URL.Query().Get("search"))

	var rows pgx.Rows
	var err error

	baseQuery := `SELECT c.id, c.first_name, COALESCE(c.last_name, ''), COALESCE(c.phone, ''), COALESCE(c.email, ''), COALESCE(c.notes, ''), c.created_at, c.updated_at,
	                     COALESCE((SELECT SUM(s.pending_amount) FROM sales s WHERE s.customer_id = c.id), 0) AS total_debt,
	                     COALESCE((SELECT SUM(s.paid_amount) FROM sales s WHERE s.customer_id = c.id AND (s.created_at AT TIME ZONE 'America/Bogota')::date >= '2026-09-07'::date), 0) AS total_paid_eligible,
	                     COALESCE((SELECT COUNT(*) FROM sales s WHERE s.customer_id = c.id AND s.stamp_reward_redeemed = TRUE), 0) AS rewards_redeemed
	              FROM customers c`

	if search != "" {
		searchPattern := "%" + search + "%"
		query := baseQuery + ` WHERE c.first_name ILIKE $1 OR c.last_name ILIKE $1 OR c.phone ILIKE $1 OR c.email ILIKE $1
		                       ORDER BY total_debt DESC, c.first_name ASC, c.last_name ASC`
		rows, err = h.DB.Query(r.Context(), query, searchPattern)
	} else {
		query := baseQuery + ` ORDER BY total_debt DESC, c.first_name ASC, c.last_name ASC`
		rows, err = h.DB.Query(r.Context(), query)
	}

	if err != nil {
		log.Printf("error consultando clientes: %v", err)
		http.Error(w, "error consultando clientes", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var customers []models.Customer
	for rows.Next() {
		var c models.Customer
		var totalPaidEligible float64
		var rewardsRedeemed int
		if err := rows.Scan(&c.ID, &c.FirstName, &c.LastName, &c.Phone, &c.Email, &c.Notes, &c.CreatedAt, &c.UpdatedAt, &c.TotalDebt, &totalPaidEligible, &rewardsRedeemed); err != nil {
			log.Printf("error leyendo cliente: %v", err)
			http.Error(w, "error leyendo cliente", http.StatusInternalServerError)
			return
		}
		stampsInfo := CalculateStampsInfo(totalPaidEligible, rewardsRedeemed)
		c.StampsInfo = &stampsInfo
		customers = append(customers, c)
	}

	if customers == nil {
		customers = []models.Customer{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(customers)
}

// GET /customers/{id}
func (h *CustomerHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	var c models.Customer
	var totalPaidEligible float64
	var rewardsRedeemed int
	err = h.DB.QueryRow(r.Context(),
		`SELECT c.id, c.first_name, COALESCE(c.last_name, ''), COALESCE(c.phone, ''), COALESCE(c.email, ''), COALESCE(c.notes, ''), c.created_at, c.updated_at,
		        COALESCE((SELECT SUM(s.pending_amount) FROM sales s WHERE s.customer_id = c.id), 0) AS total_debt,
		        COALESCE((SELECT SUM(s.paid_amount) FROM sales s WHERE s.customer_id = c.id AND (s.created_at AT TIME ZONE 'America/Bogota')::date >= '2026-09-07'::date), 0) AS total_paid_eligible,
		        COALESCE((SELECT COUNT(*) FROM sales s WHERE s.customer_id = c.id AND s.stamp_reward_redeemed = TRUE), 0) AS rewards_redeemed
		 FROM customers c
		 WHERE c.id = $1`, id,
	).Scan(&c.ID, &c.FirstName, &c.LastName, &c.Phone, &c.Email, &c.Notes, &c.CreatedAt, &c.UpdatedAt, &c.TotalDebt, &totalPaidEligible, &rewardsRedeemed)

	if errors.Is(err, pgx.ErrNoRows) {
		http.Error(w, "cliente no encontrado", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("error consultando cliente: %v", err)
		http.Error(w, "error interno", http.StatusInternalServerError)
		return
	}

	stampsInfo := CalculateStampsInfo(totalPaidEligible, rewardsRedeemed)
	c.StampsInfo = &stampsInfo

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(c)
}

type customerRequest struct {
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Phone     string `json:"phone"`
	Email     string `json:"email"`
	Notes     string `json:"notes"`
}

// POST /customers
func (h *CustomerHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req customerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "cuerpo inválido", http.StatusBadRequest)
		return
	}

	firstName := strings.TrimSpace(req.FirstName)
	if firstName == "" {
		http.Error(w, "el nombre es requerido", http.StatusBadRequest)
		return
	}

	var c models.Customer
	err := h.DB.QueryRow(r.Context(),
		`INSERT INTO customers (first_name, last_name, phone, email, notes)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, first_name, last_name, phone, email, notes, created_at, updated_at`,
		firstName, strings.TrimSpace(req.LastName), strings.TrimSpace(req.Phone),
		strings.TrimSpace(req.Email), strings.TrimSpace(req.Notes),
	).Scan(&c.ID, &c.FirstName, &c.LastName, &c.Phone, &c.Email, &c.Notes, &c.CreatedAt, &c.UpdatedAt)

	if err != nil {
		log.Printf("error creando cliente: %v", err)
		http.Error(w, "error interno", http.StatusInternalServerError)
		return
	}

	initStamps := CalculateStampsInfo(0, 0)
	c.StampsInfo = &initStamps

	if h.Hub != nil {
		h.Hub.Publish("customer_created", c)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(c)
}

// PUT /customers/{id}
func (h *CustomerHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	var req customerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "cuerpo inválido", http.StatusBadRequest)
		return
	}

	firstName := strings.TrimSpace(req.FirstName)
	if firstName == "" {
		http.Error(w, "el nombre es requerido", http.StatusBadRequest)
		return
	}

	var c models.Customer
	err = h.DB.QueryRow(r.Context(),
		`UPDATE customers
		 SET first_name = $1, last_name = $2, phone = $3, email = $4, notes = $5, updated_at = now()
		 WHERE id = $6
		 RETURNING id, first_name, last_name, phone, email, notes, created_at, updated_at`,
		firstName, strings.TrimSpace(req.LastName), strings.TrimSpace(req.Phone),
		strings.TrimSpace(req.Email), strings.TrimSpace(req.Notes), id,
	).Scan(&c.ID, &c.FirstName, &c.LastName, &c.Phone, &c.Email, &c.Notes, &c.CreatedAt, &c.UpdatedAt)

	if errors.Is(err, pgx.ErrNoRows) {
		http.Error(w, "cliente no encontrado", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("error actualizando cliente: %v", err)
		http.Error(w, "error interno", http.StatusInternalServerError)
		return
	}

	var totalDebt, totalPaidEligible float64
	var rewardsRedeemed int
	_ = h.DB.QueryRow(r.Context(),
		`SELECT COALESCE((SELECT SUM(s.pending_amount) FROM sales s WHERE s.customer_id = $1), 0),
		        COALESCE((SELECT SUM(s.paid_amount) FROM sales s WHERE s.customer_id = $1 AND (s.created_at AT TIME ZONE 'America/Bogota')::date >= '2026-09-07'::date), 0),
		        COALESCE((SELECT COUNT(*) FROM sales s WHERE s.customer_id = $1 AND s.stamp_reward_redeemed = TRUE), 0)`,
		id,
	).Scan(&totalDebt, &totalPaidEligible, &rewardsRedeemed)

	c.TotalDebt = totalDebt
	upStamps := CalculateStampsInfo(totalPaidEligible, rewardsRedeemed)
	c.StampsInfo = &upStamps

	if h.Hub != nil {
		h.Hub.Publish("customer_updated", c)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(c)
}

// DELETE /customers/{id}
func (h *CustomerHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	tag, err := h.DB.Exec(r.Context(), `DELETE FROM customers WHERE id = $1`, id)
	if err != nil {
		log.Printf("error eliminando cliente: %v", err)
		http.Error(w, "error interno", http.StatusInternalServerError)
		return
	}

	if tag.RowsAffected() == 0 {
		http.Error(w, "cliente no encontrado", http.StatusNotFound)
		return
	}

	if h.Hub != nil {
		h.Hub.Publish("customer_deleted", map[string]interface{}{"id": id})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Cliente eliminado exitosamente"})
}

// GET /customers/{id}/account - Estado de cuenta detallado, deuda y pagos del cliente
func (h *CustomerHandler) GetAccount(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	ctx := r.Context()

	var c models.Customer
	err = h.DB.QueryRow(ctx,
		`SELECT id, first_name, COALESCE(last_name, ''), COALESCE(phone, ''), COALESCE(email, ''), COALESCE(notes, ''), created_at, updated_at
		 FROM customers WHERE id = $1`, id,
	).Scan(&c.ID, &c.FirstName, &c.LastName, &c.Phone, &c.Email, &c.Notes, &c.CreatedAt, &c.UpdatedAt)

	if errors.Is(err, pgx.ErrNoRows) {
		http.Error(w, "cliente no encontrado", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "error interno", http.StatusInternalServerError)
		return
	}

	// 1. Obtener ventas pendientes con saldo deudor
	pendingRows, err := h.DB.Query(ctx,
		`SELECT s.id, COALESCE(s.sold_by, '00000000-0000-0000-0000-000000000000'::uuid),
		        COALESCE(u.username, 'Dueño'), s.customer_name, s.payment_method, s.cash_amount,
		        s.transfer_amount, COALESCE(s.bank_details, ''), s.subtotal, s.discount_percent,
		        s.discount_amount, s.discount_reason, s.total, COALESCE(s.paid_amount, s.total),
		        COALESCE(s.pending_amount, 0), COALESCE(s.payment_status, 'paid'), s.deducted_stock, s.created_at,
		        COALESCE(
		          (SELECT json_agg(json_build_object(
		             'product_id', si.product_id,
		             'product_name', COALESCE(NULLIF(si.product_name, ''), p.name, 'Producto Eliminado'),
		             'quantity', si.quantity,
		             'unit_price', si.unit_price))
		           FROM sale_items si
		           LEFT JOIN products p ON si.product_id = p.id
		           WHERE si.sale_id = s.id), '[]'::json) AS items
		 FROM sales s
		 LEFT JOIN users u ON s.sold_by = u.id
		 WHERE s.customer_id = $1 AND s.pending_amount > 0
		 ORDER BY s.created_at ASC`, id)

	var pendingSales []models.Sale
	if err == nil {
		defer pendingRows.Close()
		for pendingRows.Next() {
			var s models.Sale
			var itemsJSON []byte
			if err := pendingRows.Scan(&s.ID, &s.SoldBy, &s.SoldByUsername, &s.CustomerName,
				&s.PaymentMethod, &s.CashAmount, &s.TransferAmount, &s.BankDetails,
				&s.Subtotal, &s.DiscountPercent, &s.DiscountAmount, &s.DiscountReason,
				&s.Total, &s.PaidAmount, &s.PendingAmount, &s.PaymentStatus, &s.DeductedStock,
				&s.CreatedAt, &itemsJSON); err == nil {
				if len(itemsJSON) > 0 {
					_ = json.Unmarshal(itemsJSON, &s.Items)
				}
				pendingSales = append(pendingSales, s)
			}
		}
	}
	if pendingSales == nil {
		pendingSales = []models.Sale{}
	}

	// 2. Historial de Abonos / Pagos del cliente
	payRows, err := h.DB.Query(ctx,
		`SELECT cp.id, cp.customer_id, cp.amount, cp.payment_method, COALESCE(cp.bank_details, ''),
		        COALESCE(cp.notes, ''), cp.registered_by, COALESCE(u.username, 'Dueño'), cp.created_at
		 FROM customer_payments cp
		 LEFT JOIN users u ON cp.registered_by = u.id
		 WHERE cp.customer_id = $1
		 ORDER BY cp.created_at DESC`, id)

	var paymentHistory []models.CustomerPayment
	if err == nil {
		defer payRows.Close()
		for payRows.Next() {
			var p models.CustomerPayment
			if err := payRows.Scan(&p.ID, &p.CustomerID, &p.Amount, &p.PaymentMethod, &p.BankDetails,
				&p.Notes, &p.RegisteredBy, &p.RegisteredName, &p.CreatedAt); err == nil {
				paymentHistory = append(paymentHistory, p)
			}
		}
	}
	if paymentHistory == nil {
		paymentHistory = []models.CustomerPayment{}
	}

	// 3. Totales acumulados
	var totalSales, totalPaid, currentDebt float64
	_ = h.DB.QueryRow(ctx,
		`SELECT COALESCE(SUM(total), 0), COALESCE(SUM(paid_amount), 0), COALESCE(SUM(pending_amount), 0)
		 FROM sales WHERE customer_id = $1`, id,
	).Scan(&totalSales, &totalPaid, &currentDebt)

	c.TotalDebt = currentDebt

	var totalPaidEligible float64
	var rewardsRedeemed int
	_ = h.DB.QueryRow(ctx,
		`SELECT COALESCE((SELECT SUM(s.paid_amount) FROM sales s WHERE s.customer_id = $1 AND (s.created_at AT TIME ZONE 'America/Bogota')::date >= '2026-09-07'::date), 0),
		        COALESCE((SELECT COUNT(*) FROM sales s WHERE s.customer_id = $1 AND s.stamp_reward_redeemed = TRUE), 0)`,
		id,
	).Scan(&totalPaidEligible, &rewardsRedeemed)

	stampsInfo := CalculateStampsInfo(totalPaidEligible, rewardsRedeemed)
	c.StampsInfo = &stampsInfo

	summary := models.CustomerAccountSummary{
		Customer:       c,
		TotalSales:     totalSales,
		TotalPaid:      totalPaid,
		CurrentDebt:    currentDebt,
		StampsInfo:     stampsInfo,
		PendingSales:   pendingSales,
		PaymentHistory: paymentHistory,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(summary)
}

type paymentReq struct {
	Amount        float64 `json:"amount"`
	PaymentMethod string  `json:"payment_method"`
	BankDetails   string  `json:"bank_details"`
	Notes         string  `json:"notes"`
	CustomDate    *string `json:"custom_date"`
}

// POST /customers/{id}/payments - Registrar un Abono y amortizar deudas en orden FIFO
func (h *CustomerHandler) CreatePayment(w http.ResponseWriter, r *http.Request) {
	customerID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	var req paymentReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "cuerpo inválido", http.StatusBadRequest)
		return
	}

	if req.Amount <= 0 {
		http.Error(w, "el monto del abono debe ser mayor a cero", http.StatusBadRequest)
		return
	}

	paymentMethod := strings.ToLower(strings.TrimSpace(req.PaymentMethod))
	if paymentMethod == "" {
		paymentMethod = "efectivo"
	}

	paymentTime := time.Now()
	if req.CustomDate != nil && *req.CustomDate != "" {
		if t, err := time.Parse(time.RFC3339, *req.CustomDate); err == nil {
			paymentTime = t
		} else if t, err := time.Parse("2006-01-02T15:04:05", *req.CustomDate); err == nil {
			paymentTime = t
		} else if t, err := time.Parse("2006-01-02T15:04", *req.CustomDate); err == nil {
			paymentTime = t
		}
	}

	ctx := r.Context()
	soldByVal := ctx.Value(custommw.ContextUserID)
	var registeredBy *uuid.UUID
	if soldByVal != nil {
		if id, ok := soldByVal.(uuid.UUID); ok && id != uuid.Nil {
			registeredBy = &id
		}
	}

	tx, err := h.DB.Begin(ctx)
	if err != nil {
		log.Printf("error iniciando transacción de abono: %v", err)
		http.Error(w, "error interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(ctx)

	// Verificar cliente
	var customerName string
	err = tx.QueryRow(ctx, `SELECT TRIM(first_name || ' ' || last_name) FROM customers WHERE id = $1`, customerID).Scan(&customerName)
	if errors.Is(err, pgx.ErrNoRows) {
		http.Error(w, "cliente no encontrado", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "error interno", http.StatusInternalServerError)
		return
	}

	// 1. Insertar el abono en customer_payments
	var paymentID uuid.UUID
	err = tx.QueryRow(ctx,
		`INSERT INTO customer_payments (customer_id, amount, payment_method, bank_details, notes, registered_by, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id`,
		customerID, req.Amount, paymentMethod, strings.TrimSpace(req.BankDetails),
		strings.TrimSpace(req.Notes), registeredBy, paymentTime,
	).Scan(&paymentID)

	if err != nil {
		log.Printf("error guardando abono: %v", err)
		http.Error(w, "error interno", http.StatusInternalServerError)
		return
	}

	// 2. Amortizar deudas de ventas pendientes en orden FIFO (Venta más antigua a más reciente)
	rows, err := tx.Query(ctx,
		`SELECT id, total, COALESCE(paid_amount, 0), COALESCE(pending_amount, total)
		 FROM sales
		 WHERE customer_id = $1 AND pending_amount > 0
		 ORDER BY created_at ASC`, customerID)

	if err != nil {
		log.Printf("error consultando facturas pendientes para amortizar: %v", err)
		http.Error(w, "error interno", http.StatusInternalServerError)
		return
	}

	type pendingSaleItem struct {
		id      uuid.UUID
		total   float64
		paid    float64
		pending float64
	}
	var salesToAmortize []pendingSaleItem
	for rows.Next() {
		var s pendingSaleItem
		if err := rows.Scan(&s.id, &s.total, &s.paid, &s.pending); err == nil {
			salesToAmortize = append(salesToAmortize, s)
		}
	}
	rows.Close()

	remainingAbono := req.Amount
	for _, sale := range salesToAmortize {
		if remainingAbono <= 0 {
			break
		}

		applyAmt := math.Min(remainingAbono, sale.pending)
		newPaid := sale.paid + applyAmt
		newPending := math.Max(0, sale.pending-applyAmt)
		newStatus := "partial"
		if newPending <= 0 {
			newStatus = "paid"
		}

		_, err = tx.Exec(ctx,
			`UPDATE sales SET paid_amount = $1, pending_amount = $2, payment_status = $3 WHERE id = $4`,
			newPaid, newPending, newStatus, sale.id)

		if err != nil {
			log.Printf("error actualizando venta amortizada %s: %v", sale.id, err)
			http.Error(w, "error amortizando saldo", http.StatusInternalServerError)
			return
		}

		remainingAbono -= applyAmt
	}

	if err := tx.Commit(ctx); err != nil {
		log.Printf("error confirmando abono: %v", err)
		http.Error(w, "error interno", http.StatusInternalServerError)
		return
	}

	// Consultar nuevo saldo deudor del cliente
	var newDebt float64
	_ = h.DB.QueryRow(ctx, `SELECT COALESCE(SUM(pending_amount), 0) FROM sales WHERE customer_id = $1`, customerID).Scan(&newDebt)

	if h.Hub != nil {
		h.Hub.Publish("customer_payment_created", map[string]interface{}{
			"payment_id":    paymentID,
			"customer_id":   customerID,
			"customer_name": customerName,
			"amount":        req.Amount,
			"new_debt":      newDebt,
		})
		h.Hub.Publish("sale_updated", map[string]interface{}{"customer_id": customerID})
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":            paymentID,
		"customer_id":   customerID,
		"customer_name": customerName,
		"amount":        req.Amount,
		"new_debt":      newDebt,
		"message":       fmt.Sprintf("Abono de $%s registrado exitosamente", formatCurrency(req.Amount)),
	})
}

// DELETE /customer-payments/{id} - Revertir un abono
func (h *CustomerHandler) DeletePayment(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	tx, err := h.DB.Begin(ctx)
	if err != nil {
		http.Error(w, "error interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(ctx)

	var customerID uuid.UUID
	var amount float64
	err = tx.QueryRow(ctx, `SELECT customer_id, amount FROM customer_payments WHERE id = $1`, id).Scan(&customerID, &amount)
	if errors.Is(err, pgx.ErrNoRows) {
		http.Error(w, "abono no encontrado", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "error interno", http.StatusInternalServerError)
		return
	}

	_, _ = tx.Exec(ctx, `DELETE FROM customer_payments WHERE id = $1`, id)

	// Revertir amortización en ventas del cliente de las más recientes a más antiguas
	rows, err := tx.Query(ctx,
		`SELECT id, total, COALESCE(paid_amount, 0), COALESCE(pending_amount, 0)
		 FROM sales
		 WHERE customer_id = $1 AND paid_amount > 0
		 ORDER BY created_at DESC`, customerID)

	if err == nil {
		type saleRev struct {
			id      uuid.UUID
			total   float64
			paid    float64
			pending float64
		}
		var list []saleRev
		for rows.Next() {
			var s saleRev
			if err := rows.Scan(&s.id, &s.total, &s.paid, &s.pending); err == nil {
				list = append(list, s)
			}
		}
		rows.Close()

		revertAmount := amount
		for _, sale := range list {
			if revertAmount <= 0 {
				break
			}
			deductPaid := math.Min(revertAmount, sale.paid)
			newPaid := math.Max(0, sale.paid-deductPaid)
			newPending := math.Min(sale.total, sale.pending+deductPaid)
			newStatus := "pending"
			if newPaid > 0 {
				newStatus = "partial"
			}
			_, _ = tx.Exec(ctx, `UPDATE sales SET paid_amount = $1, pending_amount = $2, payment_status = $3 WHERE id = $4`,
				newPaid, newPending, newStatus, sale.id)
			revertAmount -= deductPaid
		}
	}

	if err := tx.Commit(ctx); err != nil {
		http.Error(w, "error interno", http.StatusInternalServerError)
		return
	}

	if h.Hub != nil {
		h.Hub.Publish("sale_updated", map[string]interface{}{"customer_id": customerID})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Abono revertido exitosamente"})
}

func formatCurrency(amt float64) string {
	return fmt.Sprintf("%.0f", amt)
}
