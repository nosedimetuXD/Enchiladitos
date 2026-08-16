package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

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
	return &AccountingHandler{DB: db, Hub: hub}
}

// GET /accounting/summary?period=today|week|month|all
func (h *AccountingHandler) GetSummary(w http.ResponseWriter, r *http.Request) {
	period := r.URL.Query().Get("period")
	var timeCondition string

	switch period {
	case "today":
		timeCondition = "created_at >= date_trunc('day', now())"
	case "week":
		timeCondition = "created_at >= date_trunc('week', now())"
	case "month":
		timeCondition = "created_at >= date_trunc('month', now())"
	default: // "all"
		timeCondition = "1=1"
	}

	summary := models.AccountingSummary{
		IncomeByPaymentMethod: make(map[string]float64),
		ExpensesByCategory:   make(map[string]float64),
	}

	// 1. Ingresos totales de ventas
	var cashIncome, transferIncome float64
	salesQuery := "SELECT COALESCE(SUM(total), 0), COUNT(id), COALESCE(SUM(cash_amount), 0), COALESCE(SUM(transfer_amount), 0) FROM sales WHERE " + timeCondition
	err := h.DB.QueryRow(r.Context(), salesQuery).Scan(&summary.TotalIncome, &summary.SalesCount, &cashIncome, &transferIncome)
	if err != nil {
		log.Printf("error calculando ingresos: %v", err)
		http.Error(w, "error calculando ingresos", http.StatusInternalServerError)
		return
	}
	summary.IncomeByPaymentMethod["efectivo"] = cashIncome
	summary.IncomeByPaymentMethod["transferencia"] = transferIncome

	// 2. Gastos totales
	expensesQuery := "SELECT COALESCE(SUM(amount), 0), COUNT(id) FROM expenses WHERE " + timeCondition
	err = h.DB.QueryRow(r.Context(), expensesQuery).Scan(&summary.TotalExpenses, &summary.ExpensesCount)
	if err != nil {
		log.Printf("error calculando gastos: %v", err)
		http.Error(w, "error calculando gastos", http.StatusInternalServerError)
		return
	}

	// 3. Gastos por categoría
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

	// 4. Estadísticas Mensuales Exclusivas para el Dueño (Owner)
	roleVal := r.Context().Value(custommw.ContextRole)
	var userRole models.UserRole
	if r, ok := roleVal.(models.UserRole); ok {
		userRole = r
	} else if rStr, ok := roleVal.(string); ok {
		userRole = models.UserRole(rStr)
	}

	if userRole == models.RoleOwner {
		mStats := &models.MonthlyStats{
			TopCustomers: []models.CustomerStat{},
		}

		// Ventas mensuales
		_ = h.DB.QueryRow(r.Context(),
			`SELECT COALESCE(SUM(total), 0) FROM sales WHERE created_at >= date_trunc('month', now())`).Scan(&mStats.MonthlyIncome)

		// Gastos mensuales
		_ = h.DB.QueryRow(r.Context(),
			`SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE created_at >= date_trunc('month', now())`).Scan(&mStats.MonthlyExpenses)

		mStats.NetProfit = mStats.MonthlyIncome - mStats.MonthlyExpenses

		// Mejor vendedor del mes (cualquier rol)
		var topSeller models.TopSellerStat
		errSeller := h.DB.QueryRow(r.Context(),
			`SELECT u.username, u.role, COALESCE(SUM(s.total), 0) as total_amount, COUNT(s.id) as sales_count
			 FROM sales s
			 JOIN users u ON s.user_id = u.id
			 WHERE s.created_at >= date_trunc('month', now())
			 GROUP BY u.id, u.username, u.role
			 ORDER BY total_amount DESC
			 LIMIT 1`).Scan(&topSeller.Username, &topSeller.Role, &topSeller.TotalAmount, &topSeller.SalesCount)
		if errSeller == nil {
			mStats.TopSeller = &topSeller
		}

		// Producto más vendido del mes
		var topProd models.TopProductStat
		errProd := h.DB.QueryRow(r.Context(),
			`SELECT p.name, COALESCE(SUM(si.quantity), 0) as total_qty, COALESCE(SUM(si.subtotal), 0) as total_amount
			 FROM sale_items si
			 JOIN sales s ON si.sale_id = s.id
			 JOIN products p ON si.product_id = p.id
			 WHERE s.created_at >= date_trunc('month', now())
			 GROUP BY p.id, p.name
			 ORDER BY total_qty DESC
			 LIMIT 1`).Scan(&topProd.ProductName, &topProd.TotalQty, &topProd.TotalAmount)
		if errProd == nil {
			mStats.TopProduct = &topProd
		}

		// Top 5 Clientes que más compraron en el mes
		custRows, errCust := h.DB.Query(r.Context(),
			`SELECT customer_name, COALESCE(SUM(total), 0) as total_spent, COUNT(id) as orders_count
			 FROM sales
			 WHERE created_at >= date_trunc('month', now()) AND TRIM(customer_name) != '' AND LOWER(customer_name) != 'cliente general'
			 GROUP BY customer_name
			 ORDER BY total_spent DESC
			 LIMIT 5`)
		if errCust == nil {
			for custRows.Next() {
				var cs models.CustomerStat
				if err := custRows.Scan(&cs.CustomerName, &cs.TotalSpent, &cs.OrdersCount); err == nil {
					mStats.TopCustomers = append(mStats.TopCustomers, cs)
				}
			}
			custRows.Close()
		}

		summary.MonthlyStats = mStats
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(summary)
}

// GET /expenses
func (h *AccountingHandler) ListExpenses(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(r.Context(),
		`SELECT e.id, e.description, e.amount, e.category, e.payment_method, e.registered_by, 
		        COALESCE(u.username, ''), e.ingredient_id, COALESCE(i.name, ''), e.quantity_added, e.created_at 
		 FROM expenses e
		 LEFT JOIN users u ON e.registered_by = u.id
		 LEFT JOIN ingredients i ON e.ingredient_id = i.id
		 ORDER BY e.created_at DESC`)
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
			&e.RegisteredBy, &e.RegistererName, &e.IngredientID, &e.IngredientName, &e.QuantityAdded, &e.CreatedAt); err != nil {
			log.Printf("error leyendo gastos: %v", err)
			http.Error(w, "error leyendo gastos", http.StatusInternalServerError)
			return
		}
		expenses = append(expenses, e)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(expenses)
}

// POST /expenses — si se especifica un ingredient_id y quantity_added > 0, reabastece el inventario
type createExpenseRequest struct {
	Description   string     `json:"description"`
	Amount        float64    `json:"amount"`
	Category      string     `json:"category"`
	PaymentMethod string     `json:"payment_method"`
	IngredientID  *uuid.UUID `json:"ingredient_id,omitempty"`
	QuantityAdded float64    `json:"quantity_added,omitempty"`
}

func (h *AccountingHandler) CreateExpense(w http.ResponseWriter, r *http.Request) {
	var req createExpenseRequest
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

	tx, err := h.DB.Begin(ctx)
	if err != nil {
		log.Printf("error iniciando transacción: %v", err)
		http.Error(w, "error interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(ctx)

	// 1. Si incluye insumo, reabastecer inventario
	if req.IngredientID != nil && req.QuantityAdded > 0 {
		tag, err := tx.Exec(ctx,
			`UPDATE ingredients SET quantity = quantity + $1, updated_at = now() WHERE id = $2`,
			req.QuantityAdded, *req.IngredientID)
		if err != nil {
			log.Printf("error reabasteciendo inventario: %v", err)
			http.Error(w, "error reabasteciendo insumo", http.StatusInternalServerError)
			return
		}
		if tag.RowsAffected() == 0 {
			http.Error(w, "el insumo especificado no existe", http.StatusBadRequest)
			return
		}
	}

	// 2. Registrar el gasto
	var expID uuid.UUID
	var createdAt time.Time
	err = tx.QueryRow(ctx,
		`INSERT INTO expenses (description, amount, category, payment_method, registered_by, ingredient_id, quantity_added)
		 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at`,
		desc, req.Amount, category, paymentMethod, registeredBy, req.IngredientID, req.QuantityAdded,
	).Scan(&expID, &createdAt)
	if err != nil {
		log.Printf("error creando gasto: %v", err)
		http.Error(w, "error registrando gasto", http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(ctx); err != nil {
		log.Printf("error confirmando transacción de gasto: %v", err)
		http.Error(w, "error interno", http.StatusInternalServerError)
		return
	}

	h.Hub.Publish("expense_created", map[string]interface{}{
		"id":          expID,
		"description": desc,
		"amount":      req.Amount,
		"category":    category,
	})

	if req.IngredientID != nil && req.QuantityAdded > 0 {
		h.Hub.Publish("inventory_updated", map[string]interface{}{
			"ingredient_id":  *req.IngredientID,
			"quantity_added": req.QuantityAdded,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":         expID,
		"created_at": createdAt,
	})
}
