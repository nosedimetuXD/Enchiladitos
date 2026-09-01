package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/NosedimetuXD/cafeteria/internal/events"
	custommw "github.com/NosedimetuXD/cafeteria/internal/middleware"
	"github.com/NosedimetuXD/cafeteria/internal/models"
)

type AccountingHandler struct {
	DB  *pgxpool.Pool
	Hub *events.Hub
}

func NewAccountingHandler(db *pgxpool.Pool, hub *events.Hub) *AccountingHandler {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, _ = db.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS incomes (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			description TEXT NOT NULL,
			amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
			category VARCHAR(50) NOT NULL DEFAULT 'otros',
			payment_method VARCHAR(255) NOT NULL DEFAULT 'efectivo',
			registered_by UUID REFERENCES users(id) ON DELETE SET NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now()
		);
		CREATE TABLE IF NOT EXISTS expenses (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			description TEXT NOT NULL,
			amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
			category VARCHAR(50) NOT NULL DEFAULT 'otros',
			payment_method VARCHAR(255) NOT NULL DEFAULT 'efectivo',
			registered_by UUID REFERENCES users(id) ON DELETE SET NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now()
		);
	`)

	return &AccountingHandler{DB: db, Hub: hub}
}

func parseAccountingTime(dateStr string, explicitTime *time.Time) time.Time {
	if explicitTime != nil && !explicitTime.IsZero() {
		return *explicitTime
	}
	ds := strings.TrimSpace(dateStr)
	if ds != "" {
		if t, err := time.Parse(time.RFC3339, ds); err == nil {
			return t
		}
		if t, err := time.Parse("2006-01-02T15:04:05", ds); err == nil {
			return t
		}
		if t, err := time.Parse("2006-01-02T15:04", ds); err == nil {
			return t
		}
		if t, err := time.Parse("2006-01-02", ds); err == nil {
			return t
		}
	}
	return time.Now()
}

// GET /accounting/summary?period=today|week|month|all&start_date=...&end_date=...&year=...&month_num=...
func (h *AccountingHandler) GetSummary(w http.ResponseWriter, r *http.Request) {
	period := r.URL.Query().Get("period")
	startDate := strings.TrimSpace(r.URL.Query().Get("start_date"))
	endDate := strings.TrimSpace(r.URL.Query().Get("end_date"))
	yearParam := strings.TrimSpace(r.URL.Query().Get("year"))
	monthParam := strings.TrimSpace(r.URL.Query().Get("month_num"))

	var timeCondition string
	var timeCondSales string

	if startDate != "" && endDate != "" {
		timeCondition = fmt.Sprintf("(created_at AT TIME ZONE 'America/Bogota')::date >= '%s'::date AND (created_at AT TIME ZONE 'America/Bogota')::date <= '%s'::date", startDate, endDate)
		timeCondSales = fmt.Sprintf("(s.created_at AT TIME ZONE 'America/Bogota')::date >= '%s'::date AND (s.created_at AT TIME ZONE 'America/Bogota')::date <= '%s'::date", startDate, endDate)
	} else if yearParam != "" && monthParam != "" {
		y, _ := strconv.Atoi(yearParam)
		m, _ := strconv.Atoi(monthParam)
		if y > 2000 && m >= 1 && m <= 12 {
			timeCondition = fmt.Sprintf("EXTRACT(YEAR FROM (created_at AT TIME ZONE 'America/Bogota')) = %d AND EXTRACT(MONTH FROM (created_at AT TIME ZONE 'America/Bogota')) = %d", y, m)
			timeCondSales = fmt.Sprintf("EXTRACT(YEAR FROM (s.created_at AT TIME ZONE 'America/Bogota')) = %d AND EXTRACT(MONTH FROM (s.created_at AT TIME ZONE 'America/Bogota')) = %d", y, m)
		}
	}

	if timeCondition == "" {
		switch period {
		case "today":
			timeCondition = "(created_at AT TIME ZONE 'America/Bogota')::date = (now() AT TIME ZONE 'America/Bogota')::date"
			timeCondSales = "(s.created_at AT TIME ZONE 'America/Bogota')::date = (now() AT TIME ZONE 'America/Bogota')::date"
		case "week":
			timeCondition = "(created_at AT TIME ZONE 'America/Bogota') >= ((now() AT TIME ZONE 'America/Bogota') - INTERVAL '7 days')"
			timeCondSales = "(s.created_at AT TIME ZONE 'America/Bogota') >= ((now() AT TIME ZONE 'America/Bogota') - INTERVAL '7 days')"
		case "month":
			timeCondition = "(created_at AT TIME ZONE 'America/Bogota') >= date_trunc('month', now() AT TIME ZONE 'America/Bogota')"
			timeCondSales = "(s.created_at AT TIME ZONE 'America/Bogota') >= date_trunc('month', now() AT TIME ZONE 'America/Bogota')"
		case "prev_month":
			timeCondition = "(created_at AT TIME ZONE 'America/Bogota') >= date_trunc('month', (now() AT TIME ZONE 'America/Bogota') - INTERVAL '1 month') AND (created_at AT TIME ZONE 'America/Bogota') < date_trunc('month', now() AT TIME ZONE 'America/Bogota')"
			timeCondSales = "(s.created_at AT TIME ZONE 'America/Bogota') >= date_trunc('month', (now() AT TIME ZONE 'America/Bogota') - INTERVAL '1 month') AND (s.created_at AT TIME ZONE 'America/Bogota') < date_trunc('month', now() AT TIME ZONE 'America/Bogota')"
		case "year":
			timeCondition = "(created_at AT TIME ZONE 'America/Bogota') >= date_trunc('year', now() AT TIME ZONE 'America/Bogota')"
			timeCondSales = "(s.created_at AT TIME ZONE 'America/Bogota') >= date_trunc('year', now() AT TIME ZONE 'America/Bogota')"
		default: // "all"
			timeCondition = "1=1"
			timeCondSales = "1=1"
		}
	}

	summary := models.AccountingSummary{
		IncomeByPaymentMethod: make(map[string]float64),
		ExpensesByCategory:   make(map[string]float64),
	}

	// 1. Ingresos por ventas
	var cashSales, transferSales, totalSales float64
	salesQuery := "SELECT COALESCE(SUM(s.total), 0), COUNT(s.id), COALESCE(SUM(s.cash_amount), 0), COALESCE(SUM(s.transfer_amount), 0) FROM sales s WHERE " + timeCondSales
	_ = h.DB.QueryRow(r.Context(), salesQuery).Scan(&totalSales, &summary.SalesCount, &cashSales, &transferSales)

	// 2. Ingresos manuales extraordinarios
	var manualIncomes float64
	incQuery := "SELECT COALESCE(SUM(amount), 0), COUNT(id) FROM incomes WHERE " + timeCondition
	_ = h.DB.QueryRow(r.Context(), incQuery).Scan(&manualIncomes, &summary.IncomesCount)

	summary.TotalIncome = totalSales + manualIncomes
	summary.IncomeByPaymentMethod["efectivo"] = cashSales
	summary.IncomeByPaymentMethod["transferencia"] = transferSales

	if summary.SalesCount > 0 {
		summary.AverageTicket = totalSales / float64(summary.SalesCount)
	}

	// 3. Gastos totales
	expensesQuery := "SELECT COALESCE(SUM(amount), 0), COUNT(id) FROM expenses WHERE " + timeCondition
	_ = h.DB.QueryRow(r.Context(), expensesQuery).Scan(&summary.TotalExpenses, &summary.ExpensesCount)

	// 4. Gastos por categoría
	catQuery := "SELECT category, COALESCE(SUM(amount), 0) FROM expenses WHERE " + timeCondition + " GROUP BY category"
	rows, err := h.DB.Query(r.Context(), catQuery)
	if err == nil {
		for rows.Next() {
			var cat string
			var amount float64
			if err := rows.Scan(&cat, &amount); err == nil {
				summary.ExpensesByCategory[cat] = amount
			}
		}
		rows.Close()
	}

	summary.NetBalance = summary.TotalIncome - summary.TotalExpenses

	mStats := &models.MonthlyStats{
		MonthlyIncome:   summary.TotalIncome,
		MonthlyExpenses: summary.TotalExpenses,
		NetProfit:       summary.NetBalance,
		AverageTicket:   summary.AverageTicket,
		TopCustomers:    []models.CustomerStat{},
		TopProducts:     []models.TopProductStat{},
		TopBanks:        []models.TopBankStat{},
	}

	// Top 10 Productos más vendidos
	prodRows, errProdList := h.DB.Query(r.Context(),
		`SELECT COALESCE(NULLIF(si.product_name, ''), p.name, 'Producto Eliminado') as prod_name,
		        COALESCE(SUM(si.quantity), 0) as total_qty, 
		        COALESCE(SUM(si.quantity * si.unit_price), 0) as total_amount
		 FROM sale_items si
		 JOIN sales s ON si.sale_id = s.id
		 LEFT JOIN products p ON si.product_id = p.id
		 WHERE `+timeCondSales+`
		 GROUP BY COALESCE(NULLIF(si.product_name, ''), p.name, 'Producto Eliminado')
		 ORDER BY total_qty DESC
		 LIMIT 10`)
	if errProdList == nil {
		for prodRows.Next() {
			var tp models.TopProductStat
			if err := prodRows.Scan(&tp.ProductName, &tp.TotalQty, &tp.TotalAmount); err == nil {
				mStats.TopProducts = append(mStats.TopProducts, tp)
			}
		}
		prodRows.Close()
	}
	if len(mStats.TopProducts) > 0 {
		mStats.TopProduct = &mStats.TopProducts[0]
	}

	// Top 10 Clientes del período
	custRows, errCust := h.DB.Query(r.Context(),
		`SELECT s.customer_name, COALESCE(SUM(s.total), 0) as total_spent, COUNT(s.id) as orders_count
		 FROM sales s
		 WHERE `+timeCondSales+` AND TRIM(s.customer_name) != '' AND LOWER(s.customer_name) != 'cliente general'
		 GROUP BY s.customer_name
		 ORDER BY total_spent DESC
		 LIMIT 10`)
	if errCust == nil {
		for custRows.Next() {
			var cs models.CustomerStat
			if err := custRows.Scan(&cs.CustomerName, &cs.TotalSpent, &cs.OrdersCount); err == nil {
				mStats.TopCustomers = append(mStats.TopCustomers, cs)
			}
		}
		custRows.Close()
	}

	// Top 5 Bancos / Métodos del período
	bankRows, errBank := h.DB.Query(r.Context(),
		`SELECT 
			COALESCE(NULLIF(TRIM(s.bank_details), ''), 'Transferencia') as bank_name,
			COUNT(s.id) as count,
			COALESCE(SUM(CASE WHEN s.transfer_amount > 0 THEN s.transfer_amount ELSE s.total END), 0) as total_amount
		 FROM sales s
		 WHERE `+timeCondSales+` 
		   AND (s.payment_method IN ('transferencia', 'mixto') OR s.transfer_amount > 0)
		 GROUP BY bank_name
		 ORDER BY count DESC, total_amount DESC
		 LIMIT 5`)
	if errBank == nil {
		for bankRows.Next() {
			var tb models.TopBankStat
			if err := bankRows.Scan(&tb.BankName, &tb.Count, &tb.TotalAmount); err == nil {
				mStats.TopBanks = append(mStats.TopBanks, tb)
			}
		}
		bankRows.Close()
	}

	summary.MonthlyStats = mStats

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(summary)
}

// GET /expenses
func (h *AccountingHandler) ListExpenses(w http.ResponseWriter, r *http.Request) {
	period := r.URL.Query().Get("period")
	startDate := strings.TrimSpace(r.URL.Query().Get("start_date"))
	endDate := strings.TrimSpace(r.URL.Query().Get("end_date"))

	var timeCondition string

	if startDate != "" && endDate != "" {
		timeCondition = fmt.Sprintf("WHERE (e.created_at AT TIME ZONE 'America/Bogota')::date >= '%s'::date AND (e.created_at AT TIME ZONE 'America/Bogota')::date <= '%s'::date", startDate, endDate)
	} else {
		switch period {
		case "today":
			timeCondition = "WHERE (e.created_at AT TIME ZONE 'America/Bogota')::date = (now() AT TIME ZONE 'America/Bogota')::date"
		case "week":
			timeCondition = "WHERE (e.created_at AT TIME ZONE 'America/Bogota') >= ((now() AT TIME ZONE 'America/Bogota') - INTERVAL '7 days')"
		case "month":
			timeCondition = "WHERE (e.created_at AT TIME ZONE 'America/Bogota') >= date_trunc('month', now() AT TIME ZONE 'America/Bogota')"
		case "prev_month":
			timeCondition = "WHERE (e.created_at AT TIME ZONE 'America/Bogota') >= date_trunc('month', (now() AT TIME ZONE 'America/Bogota') - INTERVAL '1 month') AND (e.created_at AT TIME ZONE 'America/Bogota') < date_trunc('month', now() AT TIME ZONE 'America/Bogota')"
		case "year":
			timeCondition = "WHERE (e.created_at AT TIME ZONE 'America/Bogota') >= date_trunc('year', now() AT TIME ZONE 'America/Bogota')"
		default:
			timeCondition = ""
		}
	}

	query := fmt.Sprintf(`SELECT e.id, e.description, e.amount, e.category, e.payment_method, e.registered_by, 
		        COALESCE(u.username, 'Dueño'), e.created_at 
		 FROM expenses e
		 LEFT JOIN users u ON e.registered_by = u.id
		 %s
		 ORDER BY e.created_at DESC`, timeCondition)

	rows, err := h.DB.Query(r.Context(), query)
	if err != nil {
		log.Printf("error consultando gastos: %v", err)
		http.Error(w, "error consultando gastos", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var expenses []models.Expense
	for rows.Next() {
		var e models.Expense
		if err := rows.Scan(&e.ID, &e.Description, &e.Amount, &e.Category, &e.PaymentMethod,
			&e.RegisteredBy, &e.RegistererName, &e.CreatedAt); err != nil {
			log.Printf("error leyendo gastos: %v", err)
			http.Error(w, "error leyendo gastos", http.StatusInternalServerError)
			return
		}
		expenses = append(expenses, e)
	}

	if expenses == nil {
		expenses = []models.Expense{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(expenses)
}

type expenseRequest struct {
	Description   string     `json:"description"`
	Amount        float64    `json:"amount"`
	Category      string     `json:"category"`
	PaymentMethod string     `json:"payment_method"`
	Date          string     `json:"date,omitempty"`
	CustomDate    string     `json:"custom_date,omitempty"`
	CreatedAt     *time.Time `json:"created_at,omitempty"`
}

// POST /expenses
func (h *AccountingHandler) CreateExpense(w http.ResponseWriter, r *http.Request) {
	var req expenseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "cuerpo inválido", http.StatusBadRequest)
		return
	}

	desc := strings.TrimSpace(req.Description)
	if desc == "" || req.Amount <= 0 {
		http.Error(w, "descripción y monto válido son requeridos", http.StatusBadRequest)
		return
	}

	category := strings.ToLower(strings.TrimSpace(req.Category))
	if category == "" {
		category = "otros"
	}

	paymentMethod := strings.ToLower(strings.TrimSpace(req.PaymentMethod))
	if paymentMethod == "" {
		paymentMethod = "efectivo"
	}

	expenseTime := parseAccountingTime(req.CustomDate, req.CreatedAt)
	if expenseTime.IsZero() {
		expenseTime = parseAccountingTime(req.Date, nil)
	}

	ctx := r.Context()
	userVal := ctx.Value(custommw.ContextUserID)
	var registeredBy uuid.UUID
	if userVal != nil {
		if id, ok := userVal.(uuid.UUID); ok {
			registeredBy = id
		} else if idStr, ok := userVal.(string); ok {
			registeredBy, _ = uuid.Parse(idStr)
		}
	}

	var expID uuid.UUID
	var createdAt time.Time
	err := h.DB.QueryRow(ctx,
		`INSERT INTO expenses (description, amount, category, payment_method, registered_by, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`,
		desc, req.Amount, category, paymentMethod, registeredBy, expenseTime,
	).Scan(&expID, &createdAt)
	if err != nil {
		log.Printf("error creando gasto: %v", err)
		http.Error(w, "error registrando gasto", http.StatusInternalServerError)
		return
	}

	h.Hub.Publish("expense_created", map[string]interface{}{
		"id":          expID,
		"description": desc,
		"amount":      req.Amount,
		"category":    category,
	})

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":         expID,
		"created_at": createdAt,
	})
}

// PUT /expenses/{id}
func (h *AccountingHandler) UpdateExpense(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	var req expenseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "cuerpo inválido", http.StatusBadRequest)
		return
	}

	desc := strings.TrimSpace(req.Description)
	if desc == "" || req.Amount <= 0 {
		http.Error(w, "descripción y monto válido son requeridos", http.StatusBadRequest)
		return
	}

	category := strings.ToLower(strings.TrimSpace(req.Category))
	if category == "" {
		category = "otros"
	}

	paymentMethod := strings.ToLower(strings.TrimSpace(req.PaymentMethod))
	if paymentMethod == "" {
		paymentMethod = "efectivo"
	}

	expenseTime := parseAccountingTime(req.CustomDate, req.CreatedAt)
	if expenseTime.IsZero() {
		expenseTime = parseAccountingTime(req.Date, nil)
	}

	tag, err := h.DB.Exec(r.Context(),
		`UPDATE expenses
		 SET description = $1, amount = $2, category = $3, payment_method = $4, created_at = $5
		 WHERE id = $6`,
		desc, req.Amount, category, paymentMethod, expenseTime, id,
	)
	if err != nil {
		log.Printf("error actualizando gasto: %v", err)
		http.Error(w, "error actualizando gasto", http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		http.Error(w, "gasto no encontrado", http.StatusNotFound)
		return
	}

	h.Hub.Publish("expense_updated", map[string]interface{}{"id": id})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":      id,
		"message": "Gasto actualizado exitosamente",
	})
}

// DELETE /expenses/{id}
func (h *AccountingHandler) DeleteExpense(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	tag, err := h.DB.Exec(r.Context(), `DELETE FROM expenses WHERE id = $1`, id)
	if err != nil {
		log.Printf("error eliminando gasto: %v", err)
		http.Error(w, "error eliminando gasto", http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		http.Error(w, "gasto no encontrado", http.StatusNotFound)
		return
	}

	h.Hub.Publish("expense_deleted", map[string]interface{}{"id": id})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Gasto eliminado exitosamente",
	})
}

// GET /incomes
func (h *AccountingHandler) ListIncomes(w http.ResponseWriter, r *http.Request) {
	period := r.URL.Query().Get("period")
	startDate := strings.TrimSpace(r.URL.Query().Get("start_date"))
	endDate := strings.TrimSpace(r.URL.Query().Get("end_date"))

	var timeCondition string

	if startDate != "" && endDate != "" {
		timeCondition = fmt.Sprintf("WHERE (i.created_at AT TIME ZONE 'America/Bogota')::date >= '%s'::date AND (i.created_at AT TIME ZONE 'America/Bogota')::date <= '%s'::date", startDate, endDate)
	} else {
		switch period {
		case "today":
			timeCondition = "WHERE (i.created_at AT TIME ZONE 'America/Bogota')::date = (now() AT TIME ZONE 'America/Bogota')::date"
		case "week":
			timeCondition = "WHERE (i.created_at AT TIME ZONE 'America/Bogota') >= ((now() AT TIME ZONE 'America/Bogota') - INTERVAL '7 days')"
		case "month":
			timeCondition = "WHERE (i.created_at AT TIME ZONE 'America/Bogota') >= date_trunc('month', now() AT TIME ZONE 'America/Bogota')"
		case "prev_month":
			timeCondition = "WHERE (i.created_at AT TIME ZONE 'America/Bogota') >= date_trunc('month', (now() AT TIME ZONE 'America/Bogota') - INTERVAL '1 month') AND (i.created_at AT TIME ZONE 'America/Bogota') < date_trunc('month', now() AT TIME ZONE 'America/Bogota')"
		case "year":
			timeCondition = "WHERE (i.created_at AT TIME ZONE 'America/Bogota') >= date_trunc('year', now() AT TIME ZONE 'America/Bogota')"
		default:
			timeCondition = ""
		}
	}

	query := fmt.Sprintf(`SELECT i.id, i.description, i.amount, i.category, i.payment_method, i.registered_by, 
		        COALESCE(u.username, 'Dueño'), i.created_at 
		 FROM incomes i
		 LEFT JOIN users u ON i.registered_by = u.id
		 %s
		 ORDER BY i.created_at DESC`, timeCondition)

	rows, err := h.DB.Query(r.Context(), query)
	if err != nil {
		log.Printf("error consultando ingresos manuales: %v", err)
		http.Error(w, "error consultando ingresos", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var incomes []models.Income
	for rows.Next() {
		var inc models.Income
		if err := rows.Scan(&inc.ID, &inc.Description, &inc.Amount, &inc.Category, &inc.PaymentMethod,
			&inc.RegisteredBy, &inc.RegistererName, &inc.CreatedAt); err != nil {
			log.Printf("error leyendo ingresos: %v", err)
			http.Error(w, "error leyendo ingresos", http.StatusInternalServerError)
			return
		}
		incomes = append(incomes, inc)
	}

	if incomes == nil {
		incomes = []models.Income{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(incomes)
}

// POST /incomes
func (h *AccountingHandler) CreateIncome(w http.ResponseWriter, r *http.Request) {
	var req expenseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "cuerpo inválido", http.StatusBadRequest)
		return
	}

	desc := strings.TrimSpace(req.Description)
	if desc == "" || req.Amount <= 0 {
		http.Error(w, "descripción y monto válido son requeridos", http.StatusBadRequest)
		return
	}

	category := strings.ToLower(strings.TrimSpace(req.Category))
	if category == "" {
		category = "otros"
	}

	paymentMethod := strings.ToLower(strings.TrimSpace(req.PaymentMethod))
	if paymentMethod == "" {
		paymentMethod = "efectivo"
	}

	incomeTime := parseAccountingTime(req.CustomDate, req.CreatedAt)
	if incomeTime.IsZero() {
		incomeTime = parseAccountingTime(req.Date, nil)
	}

	ctx := r.Context()
	userVal := ctx.Value(custommw.ContextUserID)
	var registeredBy uuid.UUID
	if userVal != nil {
		if id, ok := userVal.(uuid.UUID); ok {
			registeredBy = id
		} else if idStr, ok := userVal.(string); ok {
			registeredBy, _ = uuid.Parse(idStr)
		}
	}

	var incID uuid.UUID
	var createdAt time.Time
	err := h.DB.QueryRow(ctx,
		`INSERT INTO incomes (description, amount, category, payment_method, registered_by, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`,
		desc, req.Amount, category, paymentMethod, registeredBy, incomeTime,
	).Scan(&incID, &createdAt)
	if err != nil {
		log.Printf("error creando ingreso manual: %v", err)
		http.Error(w, "error registrando ingreso", http.StatusInternalServerError)
		return
	}

	h.Hub.Publish("income_created", map[string]interface{}{
		"id":          incID,
		"description": desc,
		"amount":      req.Amount,
		"category":    category,
	})

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":         incID,
		"created_at": createdAt,
	})
}

// PUT /incomes/{id}
func (h *AccountingHandler) UpdateIncome(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	var req expenseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "cuerpo inválido", http.StatusBadRequest)
		return
	}

	desc := strings.TrimSpace(req.Description)
	if desc == "" || req.Amount <= 0 {
		http.Error(w, "descripción y monto válido son requeridos", http.StatusBadRequest)
		return
	}

	category := strings.ToLower(strings.TrimSpace(req.Category))
	if category == "" {
		category = "otros"
	}

	paymentMethod := strings.ToLower(strings.TrimSpace(req.PaymentMethod))
	if paymentMethod == "" {
		paymentMethod = "efectivo"
	}

	incomeTime := parseAccountingTime(req.CustomDate, req.CreatedAt)
	if incomeTime.IsZero() {
		incomeTime = parseAccountingTime(req.Date, nil)
	}

	tag, err := h.DB.Exec(r.Context(),
		`UPDATE incomes
		 SET description = $1, amount = $2, category = $3, payment_method = $4, created_at = $5
		 WHERE id = $6`,
		desc, req.Amount, category, paymentMethod, incomeTime, id,
	)
	if err != nil {
		log.Printf("error actualizando ingreso: %v", err)
		http.Error(w, "error actualizando ingreso", http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		http.Error(w, "ingreso no encontrado", http.StatusNotFound)
		return
	}

	h.Hub.Publish("income_updated", map[string]interface{}{"id": id})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":      id,
		"message": "Ingreso actualizado exitosamente",
	})
}

// DELETE /incomes/{id}
func (h *AccountingHandler) DeleteIncome(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	tag, err := h.DB.Exec(r.Context(), `DELETE FROM incomes WHERE id = $1`, id)
	if err != nil {
		log.Printf("error eliminando ingreso: %v", err)
		http.Error(w, "error eliminando ingreso", http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		http.Error(w, "ingreso no encontrado", http.StatusNotFound)
		return
	}

	h.Hub.Publish("income_deleted", map[string]interface{}{"id": id})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Ingreso eliminado exitosamente",
	})
}
