package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math"
	"net/http"
	"strconv"
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

type SaleHandler struct {
	DB  *pgxpool.Pool
	Hub *events.Hub
}

func NewSaleHandler(db *pgxpool.Pool, hub *events.Hub) *SaleHandler {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, _ = db.Exec(ctx, `ALTER TABLE sales ADD COLUMN IF NOT EXISTS bank_details TEXT DEFAULT ''`)
	_, _ = db.Exec(ctx, `ALTER TABLE sales ADD COLUMN IF NOT EXISTS sold_by_name TEXT DEFAULT ''`)
	_, _ = db.Exec(ctx, `ALTER TABLE sales ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2) DEFAULT 0`)
	_, _ = db.Exec(ctx, `ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) DEFAULT 0`)
	_, _ = db.Exec(ctx, `ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0`)
	_, _ = db.Exec(ctx, `ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount_reason TEXT DEFAULT ''`)
	_, _ = db.Exec(ctx, `ALTER TABLE sales ADD COLUMN IF NOT EXISTS deducted_stock BOOLEAN DEFAULT TRUE`)
	_, _ = db.Exec(ctx, `ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL`)
	_, _ = db.Exec(ctx, `ALTER TABLE sales ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(10,2) DEFAULT 0`)
	_, _ = db.Exec(ctx, `ALTER TABLE sales ADD COLUMN IF NOT EXISTS pending_amount NUMERIC(10,2) DEFAULT 0`)
	_, _ = db.Exec(ctx, `ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'paid'`)
	_, _ = db.Exec(ctx, `ALTER TABLE sales ALTER COLUMN sold_by DROP NOT NULL`)
	_, _ = db.Exec(ctx, `ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_payment_method_check`)
	_, _ = db.Exec(ctx, `ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_payment_status_check`)
	_, _ = db.Exec(ctx, `ALTER TABLE sales ALTER COLUMN payment_method TYPE VARCHAR(50)`)

	// Retrocompatibilidad: si subtotal es 0 o paid_amount no está configurado, actualizar
	_, _ = db.Exec(ctx, `UPDATE sales SET subtotal = total WHERE subtotal = 0 AND total > 0`)
	_, _ = db.Exec(ctx, `UPDATE sales SET paid_amount = total, pending_amount = 0, payment_status = 'paid' WHERE paid_amount = 0 AND pending_amount = 0 AND total > 0`)

	_, _ = db.Exec(ctx, `ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS product_name TEXT DEFAULT ''`)
	_, _ = db.Exec(ctx, `UPDATE sale_items si SET product_name = p.name FROM products p WHERE si.product_id = p.id AND (si.product_name IS NULL OR si.product_name = '')`)

	_, _ = db.Exec(ctx, `
		DO $$ 
		BEGIN 
			IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'sales_sold_by_fkey') THEN
				ALTER TABLE sales DROP CONSTRAINT sales_sold_by_fkey;
			END IF;
			ALTER TABLE sales ADD CONSTRAINT sales_sold_by_fkey FOREIGN KEY (sold_by) REFERENCES users(id) ON DELETE SET NULL;

			IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comandas') THEN
				ALTER TABLE comandas DROP CONSTRAINT IF EXISTS comandas_sale_id_fkey;
				ALTER TABLE comandas ADD CONSTRAINT comandas_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE;
			END IF;
		END $$;
	`)

	return &SaleHandler{DB: db, Hub: hub}
}

// GET /sales?period=today|week|month|all&start_date=...&end_date=...&year=...&month_num=...
func (h *SaleHandler) List(w http.ResponseWriter, r *http.Request) {
	period := r.URL.Query().Get("period")
	startDate := strings.TrimSpace(r.URL.Query().Get("start_date"))
	endDate := strings.TrimSpace(r.URL.Query().Get("end_date"))
	yearParam := strings.TrimSpace(r.URL.Query().Get("year"))
	monthParam := strings.TrimSpace(r.URL.Query().Get("month_num"))

	var rawCond string

	if startDate != "" && endDate != "" {
		rawCond = fmt.Sprintf("(s.created_at AT TIME ZONE 'America/Bogota')::date >= '%s'::date AND (s.created_at AT TIME ZONE 'America/Bogota')::date <= '%s'::date", startDate, endDate)
	} else if yearParam != "" && monthParam != "" {
		y, _ := strconv.Atoi(yearParam)
		m, _ := strconv.Atoi(monthParam)
		if y > 2000 && m >= 1 && m <= 12 {
			rawCond = fmt.Sprintf("EXTRACT(YEAR FROM (s.created_at AT TIME ZONE 'America/Bogota')) = %d AND EXTRACT(MONTH FROM (s.created_at AT TIME ZONE 'America/Bogota')) = %d", y, m)
		}
	}

	if rawCond == "" {
		switch period {
		case "today":
			rawCond = "(s.created_at AT TIME ZONE 'America/Bogota')::date = (now() AT TIME ZONE 'America/Bogota')::date"
		case "week":
			rawCond = "(s.created_at AT TIME ZONE 'America/Bogota') >= ((now() AT TIME ZONE 'America/Bogota') - INTERVAL '7 days')"
		case "month":
			rawCond = "(s.created_at AT TIME ZONE 'America/Bogota') >= date_trunc('month', now() AT TIME ZONE 'America/Bogota')"
		case "prev_month":
			rawCond = "(s.created_at AT TIME ZONE 'America/Bogota') >= date_trunc('month', (now() AT TIME ZONE 'America/Bogota') - INTERVAL '1 month') AND (s.created_at AT TIME ZONE 'America/Bogota') < date_trunc('month', now() AT TIME ZONE 'America/Bogota')"
		case "year":
			rawCond = "(s.created_at AT TIME ZONE 'America/Bogota') >= date_trunc('year', now() AT TIME ZONE 'America/Bogota')"
		default: // "all"
			rawCond = ""
		}
	}

	var timeCondition string
	if rawCond != "" {
		timeCondition = "WHERE " + rawCond
	}

	query := fmt.Sprintf(`SELECT s.id, COALESCE(s.sold_by, '00000000-0000-0000-0000-000000000000'::uuid), 
		        COALESCE(NULLIF(s.sold_by_name, ''), u.username, 'Dueño'), s.customer_id, COALESCE(s.customer_name, 'Cliente General'), 
		        COALESCE(s.payment_method, 'efectivo'), COALESCE(s.cash_amount, 0), COALESCE(s.transfer_amount, 0), 
		        COALESCE(s.bank_details, ''), COALESCE(s.subtotal, s.total), COALESCE(s.discount_percent, 0),
		        COALESCE(s.discount_amount, 0), COALESCE(s.discount_reason, ''), s.total, 
		        COALESCE(s.paid_amount, s.total), COALESCE(s.pending_amount, 0), COALESCE(s.payment_status, 'paid'),
		        COALESCE(s.deducted_stock, true), s.created_at,
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
		 %s
		 ORDER BY s.created_at DESC`, timeCondition)

	rows, err := h.DB.Query(r.Context(), query)
	if err != nil {
		log.Printf("error consultando ventas: %v", err)
		http.Error(w, "error consultando ventas", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var sales []models.Sale
	for rows.Next() {
		var s models.Sale
		var itemsJSON []byte
		if err := rows.Scan(&s.ID, &s.SoldBy, &s.SoldByUsername, &s.CustomerID, &s.CustomerName,
			&s.PaymentMethod, &s.CashAmount, &s.TransferAmount, &s.BankDetails,
			&s.Subtotal, &s.DiscountPercent, &s.DiscountAmount, &s.DiscountReason,
			&s.Total, &s.PaidAmount, &s.PendingAmount, &s.PaymentStatus,
			&s.DeductedStock, &s.CreatedAt, &itemsJSON); err != nil {
			log.Printf("error leyendo ventas: %v", err)
			http.Error(w, "error leyendo ventas", http.StatusInternalServerError)
			return
		}
		if len(itemsJSON) > 0 {
			_ = json.Unmarshal(itemsJSON, &s.Items)
		}
		sales = append(sales, s)
	}

	if sales == nil {
		sales = []models.Sale{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(sales)
}

// GET /sales/{id}
func (h *SaleHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	var s models.Sale
	err = h.DB.QueryRow(r.Context(),
		`SELECT s.id, COALESCE(s.sold_by, '00000000-0000-0000-0000-000000000000'::uuid), 
		        COALESCE(u.username, 'Dueño'), s.customer_id, COALESCE(s.customer_name, 'Cliente General'), 
		        COALESCE(s.payment_method, 'efectivo'), COALESCE(s.cash_amount, 0), COALESCE(s.transfer_amount, 0), 
		        COALESCE(s.bank_details, ''), COALESCE(s.subtotal, s.total), COALESCE(s.discount_percent, 0),
		        COALESCE(s.discount_amount, 0), COALESCE(s.discount_reason, ''), s.total, 
		        COALESCE(s.paid_amount, s.total), COALESCE(s.pending_amount, 0), COALESCE(s.payment_status, 'paid'),
		        COALESCE(s.deducted_stock, true), s.created_at 
		 FROM sales s
		 LEFT JOIN users u ON s.sold_by = u.id
		 WHERE s.id = $1`, id,
	).Scan(&s.ID, &s.SoldBy, &s.SoldByUsername, &s.CustomerID, &s.CustomerName,
		&s.PaymentMethod, &s.CashAmount, &s.TransferAmount, &s.BankDetails,
		&s.Subtotal, &s.DiscountPercent, &s.DiscountAmount, &s.DiscountReason,
		&s.Total, &s.PaidAmount, &s.PendingAmount, &s.PaymentStatus,
		&s.DeductedStock, &s.CreatedAt)

	if errors.Is(err, pgx.ErrNoRows) {
		http.Error(w, "venta no encontrada", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("error consultando venta: %v", err)
		http.Error(w, "error consultando venta", http.StatusInternalServerError)
		return
	}

	rows, err := h.DB.Query(r.Context(),
		`SELECT si.product_id, COALESCE(NULLIF(si.product_name, ''), p.name, 'Producto Eliminado'), si.quantity, si.unit_price 
		 FROM sale_items si
		 LEFT JOIN products p ON si.product_id = p.id
		 WHERE si.sale_id = $1`, id)
	if err != nil {
		log.Printf("error consultando items: %v", err)
		http.Error(w, "error consultando items", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var item models.SaleItem
		if err := rows.Scan(&item.ProductID, &item.ProductName, &item.Quantity, &item.UnitPrice); err != nil {
			log.Printf("error leyendo item: %v", err)
			http.Error(w, "error interno", http.StatusInternalServerError)
			return
		}
		s.Items = append(s.Items, item)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(s)
}

type saleItemRequest struct {
	ProductID uuid.UUID `json:"product_id"`
	Quantity  int       `json:"quantity"`
	UnitPrice *float64  `json:"unit_price,omitempty"`
}

type saleRequest struct {
	CustomerID      *uuid.UUID        `json:"customer_id"`
	CustomerName    string            `json:"customer_name"`
	PaymentMethod   string            `json:"payment_method"`
	CashAmount      float64           `json:"cash_amount"`
	TransferAmount  float64           `json:"transfer_amount"`
	BankDetails     string            `json:"bank_details"`
	DiscountPercent float64           `json:"discount_percent"`
	DiscountAmount  float64           `json:"discount_amount"`
	DiscountReason  string            `json:"discount_reason"`
	PaidAmount      *float64          `json:"paid_amount"`
	DeductStock     *bool             `json:"deduct_stock"`
	CustomDate      *string           `json:"custom_date"`
	Items           []saleItemRequest `json:"items"`
}

func parseSaleTime(req saleRequest) time.Time {
	if req.CustomDate != nil && strings.TrimSpace(*req.CustomDate) != "" {
		dateStr := strings.TrimSpace(*req.CustomDate)
		if t, err := time.Parse(time.RFC3339, dateStr); err == nil {
			return t
		}
		if t, err := time.Parse("2006-01-02T15:04:05", dateStr); err == nil {
			return t
		}
		if t, err := time.Parse("2006-01-02T15:04", dateStr); err == nil {
			return t
		}
		if t, err := time.Parse("2006-01-02", dateStr); err == nil {
			return t
		}
	}
	return time.Now()
}

func (h *SaleHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req saleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "cuerpo inválido", http.StatusBadRequest)
		return
	}
	if len(req.Items) == 0 {
		http.Error(w, "la venta debe tener al menos un producto", http.StatusBadRequest)
		return
	}
	for _, item := range req.Items {
		if item.Quantity <= 0 {
			http.Error(w, "la cantidad debe ser mayor a cero", http.StatusBadRequest)
			return
		}
	}

	customerName := strings.TrimSpace(req.CustomerName)
	if customerName == "" {
		customerName = "Cliente General"
	}

	paymentMethod := strings.ToLower(strings.TrimSpace(req.PaymentMethod))
	if paymentMethod == "" {
		paymentMethod = "efectivo"
	}

	deductStock := true
	if req.DeductStock != nil {
		deductStock = *req.DeductStock
	}

	saleTime := parseSaleTime(req)

	ctx := r.Context()
	soldByVal := ctx.Value(custommw.ContextUserID)
	var soldBy *uuid.UUID
	var soldByName string
	if soldByVal != nil {
		if id, ok := soldByVal.(uuid.UUID); ok && id != uuid.Nil {
			soldBy = &id
		} else if idStr, ok := soldByVal.(string); ok {
			if parsed, err := uuid.Parse(idStr); err == nil && parsed != uuid.Nil {
				soldBy = &parsed
			}
		}
	}

	tx, err := h.DB.Begin(ctx)
	if err != nil {
		log.Printf("error iniciando transacción: %v", err)
		http.Error(w, "error interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(ctx)

	if soldBy != nil {
		_ = tx.QueryRow(ctx, `SELECT COALESCE(username, 'Dueño') FROM users WHERE id = $1`, *soldBy).Scan(&soldByName)
	}

	var customerID *uuid.UUID
	if req.CustomerID != nil && *req.CustomerID != uuid.Nil {
		customerID = req.CustomerID
		if customerName == "" || customerName == "Cliente General" {
			var fn, ln string
			if err := tx.QueryRow(ctx, `SELECT first_name, COALESCE(last_name, '') FROM customers WHERE id = $1`, *customerID).Scan(&fn, &ln); err == nil {
				customerName = strings.TrimSpace(fn + " " + ln)
			}
		}
	}

	var subtotal float64
	type resolvedItem struct {
		ProductID   uuid.UUID
		ProductName string
		Quantity    int
		UnitPrice   float64
	}
	var resolved []resolvedItem

	for _, item := range req.Items {
		var name string
		var price float64
		var active bool
		var currentStock int
		err := tx.QueryRow(ctx,
			`SELECT name, price, active, COALESCE(stock, 0) FROM products WHERE id = $1`, item.ProductID,
		).Scan(&name, &price, &active, &currentStock)
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, fmt.Sprintf("producto %s no existe", item.ProductID), http.StatusBadRequest)
			return
		}
		if err != nil {
			log.Printf("error consultando producto: %v", err)
			http.Error(w, "error interno", http.StatusInternalServerError)
			return
		}

		if deductStock && currentStock < item.Quantity {
			http.Error(w, fmt.Sprintf("El producto '%s' está agotado o no cuenta con suficiente stock (Disponible: %d, Solicitado: %d). Solo se permite registrarla si se marca como venta pasada (sin descontar stock).", name, currentStock, item.Quantity), http.StatusBadRequest)
			return
		}

		unitPrice := price
		if item.UnitPrice != nil && *item.UnitPrice >= 0 {
			unitPrice = *item.UnitPrice
		}

		subtotal += unitPrice * float64(item.Quantity)
		resolved = append(resolved, resolvedItem{
			ProductID:   item.ProductID,
			ProductName: name,
			Quantity:    item.Quantity,
			UnitPrice:   unitPrice,
		})
	}

	discountPercent := req.DiscountPercent
	discountAmount := req.DiscountAmount
	if discountPercent > 0 && discountAmount == 0 {
		discountAmount = (subtotal * discountPercent) / 100.0
	} else if discountAmount > 0 && discountPercent == 0 && subtotal > 0 {
		discountPercent = (discountAmount / subtotal) * 100.0
	}

	total := subtotal - discountAmount
	if total < 0 {
		total = 0
	}

	paidAmount := total
	if req.PaidAmount != nil {
		paidAmount = *req.PaidAmount
		if paidAmount < 0 {
			paidAmount = 0
		}
		if paidAmount > total {
			paidAmount = total
		}
	} else if paymentMethod == "credito" {
		paidAmount = 0
	}
	pendingAmount := math.Max(0, total-paidAmount)

	paymentStatus := "paid"
	if pendingAmount > 0 {
		if paidAmount > 0 {
			paymentStatus = "partial"
		} else {
			paymentStatus = "pending"
		}
	}

	cashAmount := req.CashAmount
	transferAmount := req.TransferAmount
	if paymentMethod == "efectivo" {
		cashAmount = paidAmount
		transferAmount = 0
	} else if paymentMethod == "transferencia" {
		cashAmount = 0
		transferAmount = paidAmount
	} else if paymentMethod == "credito" {
		cashAmount = 0
		transferAmount = 0
	}

	// Si se debe descontar stock, descontar directamente de la tabla products
	if deductStock {
		for _, item := range resolved {
			_, err := tx.Exec(ctx,
				`UPDATE products SET stock = GREATEST(0, stock - $1), updated_at = now() WHERE id = $2`,
				item.Quantity, item.ProductID)
			if err != nil {
				log.Printf("error descontando stock: %v", err)
				http.Error(w, "error descontando stock", http.StatusInternalServerError)
				return
			}
		}
	}

	var saleID uuid.UUID
	var createdAt time.Time
	err = tx.QueryRow(ctx,
		`INSERT INTO sales (sold_by, sold_by_name, customer_id, customer_name, payment_method, cash_amount, transfer_amount, 
		                    bank_details, subtotal, discount_percent, discount_amount, discount_reason, 
		                    total, paid_amount, pending_amount, payment_status, deducted_stock, created_at) 
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) 
		 RETURNING id, created_at`,
		soldBy, soldByName, customerID, customerName, paymentMethod, cashAmount, transferAmount,
		strings.TrimSpace(req.BankDetails), subtotal, discountPercent, discountAmount,
		strings.TrimSpace(req.DiscountReason), total, paidAmount, pendingAmount, paymentStatus, deductStock, saleTime,
	).Scan(&saleID, &createdAt)
	if err != nil {
		log.Printf("error creando venta: %v", err)
		http.Error(w, "error interno", http.StatusInternalServerError)
		return
	}

	for _, item := range resolved {
		_, err = tx.Exec(ctx,
			`INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price)
			 VALUES ($1, $2, $3, $4, $5)`,
			saleID, item.ProductID, item.ProductName, item.Quantity, item.UnitPrice)
		if err != nil {
			log.Printf("error creando item de venta: %v", err)
			http.Error(w, "error interno", http.StatusInternalServerError)
			return
		}
	}

	if err := tx.Commit(ctx); err != nil {
		log.Printf("error confirmando venta: %v", err)
		http.Error(w, "error interno", http.StatusInternalServerError)
		return
	}

	if h.Hub != nil {
		h.Hub.Publish("sale_created", map[string]interface{}{
			"id":             saleID,
			"customer_id":    req.CustomerID,
			"customer_name":  customerName,
			"payment_method": paymentMethod,
			"subtotal":       subtotal,
			"total":          total,
			"paid_amount":    paidAmount,
			"pending_amount": pendingAmount,
			"payment_status": paymentStatus,
			"created_at":     createdAt,
		})
		h.Hub.Publish("inventory_updated", map[string]interface{}{"action": "sale_created"})
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":             saleID,
		"customer_id":    req.CustomerID,
		"customer_name":  customerName,
		"payment_method": paymentMethod,
		"subtotal":       subtotal,
		"total":          total,
		"paid_amount":    paidAmount,
		"pending_amount": pendingAmount,
		"payment_status": paymentStatus,
		"created_at":     createdAt,
	})
}

// PUT /sales/{id}
func (h *SaleHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	var req saleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "cuerpo inválido", http.StatusBadRequest)
		return
	}
	if len(req.Items) == 0 {
		http.Error(w, "la venta debe tener al menos un producto", http.StatusBadRequest)
		return
	}

	customerName := strings.TrimSpace(req.CustomerName)
	if customerName == "" {
		customerName = "Cliente General"
	}

	saleTime := parseSaleTime(req)

	ctx := r.Context()
	tx, err := h.DB.Begin(ctx)
	if err != nil {
		log.Printf("error iniciando transacción de edición: %v", err)
		http.Error(w, "error interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(ctx)

	// 1. Obtener datos actuales de la venta
	var oldDeductedStock bool
	err = tx.QueryRow(ctx, `SELECT COALESCE(deducted_stock, true) FROM sales WHERE id = $1`, id).Scan(&oldDeductedStock)
	if errors.Is(err, pgx.ErrNoRows) {
		http.Error(w, "venta no encontrada", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("error consultando venta previa: %v", err)
		http.Error(w, "error interno", http.StatusInternalServerError)
		return
	}

	// 2. Si la venta anterior descontó stock, devolverlo primero
	if oldDeductedStock {
		oldRows, err := tx.Query(ctx, `SELECT product_id, quantity FROM sale_items WHERE sale_id = $1`, id)
		if err == nil {
			for oldRows.Next() {
				var pID *uuid.UUID
				var qty int
				if err := oldRows.Scan(&pID, &qty); err == nil && pID != nil && *pID != uuid.Nil {
					_, _ = tx.Exec(ctx, `UPDATE products SET stock = stock + $1 WHERE id = $2`, qty, *pID)
				}
			}
			oldRows.Close()
		}
	}

	// 3. Procesar nuevos items
	deductStock := true
	if req.DeductStock != nil {
		deductStock = *req.DeductStock
	}

	var subtotal float64
	type resolvedItem struct {
		ProductID   uuid.UUID
		ProductName string
		Quantity    int
		UnitPrice   float64
	}
	var resolved []resolvedItem

	for _, item := range req.Items {
		var name string
		var price float64
		var currentStock int
		err := tx.QueryRow(ctx, `SELECT name, price, COALESCE(stock, 0) FROM products WHERE id = $1`, item.ProductID).Scan(&name, &price, &currentStock)
		if err != nil {
			name = "Producto"
			price = 0
			currentStock = 0
		}

		if deductStock && currentStock < item.Quantity {
			http.Error(w, fmt.Sprintf("El producto '%s' no cuenta con suficiente stock (Disponible: %d, Solicitado: %d). Solo se permite registrarla si se marca como venta pasada (sin descontar stock).", name, currentStock, item.Quantity), http.StatusBadRequest)
			return
		}

		unitPrice := price
		if item.UnitPrice != nil && *item.UnitPrice >= 0 {
			unitPrice = *item.UnitPrice
		}
		subtotal += unitPrice * float64(item.Quantity)
		resolved = append(resolved, resolvedItem{
			ProductID:   item.ProductID,
			ProductName: name,
			Quantity:    item.Quantity,
			UnitPrice:   unitPrice,
		})
	}

	discountPercent := req.DiscountPercent
	discountAmount := req.DiscountAmount
	if discountPercent > 0 && discountAmount == 0 {
		discountAmount = (subtotal * discountPercent) / 100.0
	} else if discountAmount > 0 && discountPercent == 0 && subtotal > 0 {
		discountPercent = (discountAmount / subtotal) * 100.0
	}

	total := subtotal - discountAmount
	if total < 0 {
		total = 0
	}

	paymentMethod := strings.ToLower(strings.TrimSpace(req.PaymentMethod))
	if paymentMethod == "" {
		paymentMethod = "efectivo"
	}

	paidAmount := total
	if req.PaidAmount != nil {
		paidAmount = *req.PaidAmount
		if paidAmount < 0 {
			paidAmount = 0
		}
		if paidAmount > total {
			paidAmount = total
		}
	} else if paymentMethod == "credito" {
		paidAmount = 0
	}
	pendingAmount := math.Max(0, total-paidAmount)

	paymentStatus := "paid"
	if pendingAmount > 0 {
		if paidAmount > 0 {
			paymentStatus = "partial"
		} else {
			paymentStatus = "pending"
		}
	}

	cashAmount := req.CashAmount
	transferAmount := req.TransferAmount
	if paymentMethod == "efectivo" {
		cashAmount = paidAmount
		transferAmount = 0
	} else if paymentMethod == "transferencia" {
		cashAmount = 0
		transferAmount = paidAmount
	} else if paymentMethod == "credito" {
		cashAmount = 0
		transferAmount = 0
	}

	var customerID *uuid.UUID
	if req.CustomerID != nil && *req.CustomerID != uuid.Nil {
		customerID = req.CustomerID
		if customerName == "" || customerName == "Cliente General" {
			var fn, ln string
			if err := tx.QueryRow(ctx, `SELECT first_name, COALESCE(last_name, '') FROM customers WHERE id = $1`, *customerID).Scan(&fn, &ln); err == nil {
				customerName = strings.TrimSpace(fn + " " + ln)
			}
		}
	}

	// 4. Si la nueva versión descuenta stock, aplicarlo
	if deductStock {
		for _, item := range resolved {
			_, _ = tx.Exec(ctx,
				`UPDATE products SET stock = GREATEST(0, stock - $1), updated_at = now() WHERE id = $2`,
				item.Quantity, item.ProductID)
		}
	}

	// 5. Actualizar registro principal
	_, err = tx.Exec(ctx,
		`UPDATE sales 
		 SET customer_id = $1, customer_name = $2, payment_method = $3, cash_amount = $4, transfer_amount = $5,
		     bank_details = $6, subtotal = $7, discount_percent = $8, discount_amount = $9, discount_reason = $10,
		     total = $11, paid_amount = $12, pending_amount = $13, payment_status = $14,
		     deducted_stock = $15, created_at = $16
		 WHERE id = $17`,
		customerID, customerName, paymentMethod, cashAmount, transferAmount,
		strings.TrimSpace(req.BankDetails), subtotal, discountPercent, discountAmount,
		strings.TrimSpace(req.DiscountReason), total, paidAmount, pendingAmount, paymentStatus,
		deductStock, saleTime, id)

	if err != nil {
		log.Printf("error actualizando venta: %v", err)
		http.Error(w, "error actualizando venta", http.StatusInternalServerError)
		return
	}

	// 6. Reemplazar sale_items
	_, _ = tx.Exec(ctx, `DELETE FROM sale_items WHERE sale_id = $1`, id)
	for _, item := range resolved {
		_, _ = tx.Exec(ctx,
			`INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price)
			 VALUES ($1, $2, $3, $4, $5)`,
			id, item.ProductID, item.ProductName, item.Quantity, item.UnitPrice)
	}

	if err := tx.Commit(ctx); err != nil {
		log.Printf("error confirmando edición de venta: %v", err)
		http.Error(w, "error interno", http.StatusInternalServerError)
		return
	}

	if h.Hub != nil {
		h.Hub.Publish("sale_updated", map[string]interface{}{"id": id, "total": total, "pending_amount": pendingAmount})
		h.Hub.Publish("inventory_updated", map[string]interface{}{"action": "sale_updated"})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":             id,
		"message":        "Venta actualizada exitosamente",
		"subtotal":       subtotal,
		"total":          total,
		"paid_amount":    paidAmount,
		"pending_amount": pendingAmount,
		"payment_status": paymentStatus,
		"created_at":     saleTime,
	})
}

// DELETE /sales/{id} - Elimina una venta y revierte el stock si fue descontado
func (h *SaleHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	tx, err := h.DB.Begin(ctx)
	if err != nil {
		log.Printf("error iniciando transacción: %v", err)
		http.Error(w, "error interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(ctx)

	var deductedStock bool
	err = tx.QueryRow(ctx, `SELECT COALESCE(deducted_stock, true) FROM sales WHERE id = $1`, id).Scan(&deductedStock)
	if errors.Is(err, pgx.ErrNoRows) {
		http.Error(w, "venta no encontrada", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("error consultando venta para eliminar: %v", err)
		http.Error(w, "error interno", http.StatusInternalServerError)
		return
	}

	// Devolver stock si fue descontado
	if deductedStock {
		rows, err := tx.Query(ctx, `SELECT product_id, quantity FROM sale_items WHERE sale_id = $1`, id)
		if err == nil {
			for rows.Next() {
				var pID *uuid.UUID
				var qty int
				if err := rows.Scan(&pID, &qty); err == nil && pID != nil && *pID != uuid.Nil {
					_, _ = tx.Exec(ctx, `UPDATE products SET stock = stock + $1 WHERE id = $2`, qty, *pID)
				}
			}
			rows.Close()
		}
	}

	_, _ = tx.Exec(ctx, `DELETE FROM comanda_items WHERE comanda_id IN (SELECT id FROM comandas WHERE sale_id = $1)`, id)
	_, _ = tx.Exec(ctx, `DELETE FROM comandas WHERE sale_id = $1`, id)
	_, _ = tx.Exec(ctx, `DELETE FROM sale_items WHERE sale_id = $1`, id)

	tag, err := tx.Exec(ctx, `DELETE FROM sales WHERE id = $1`, id)
	if err != nil {
		log.Printf("error eliminando venta: %v", err)
		http.Error(w, fmt.Sprintf("error eliminando venta: %v", err), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		http.Error(w, "venta no encontrada", http.StatusNotFound)
		return
	}

	if err := tx.Commit(ctx); err != nil {
		log.Printf("error confirmando borrado: %v", err)
		http.Error(w, "error interno", http.StatusInternalServerError)
		return
	}

	if h.Hub != nil {
		h.Hub.Publish("sale_deleted", map[string]interface{}{"id": id})
		h.Hub.Publish("inventory_updated", map[string]interface{}{"action": "sale_deleted"})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": fmt.Sprintf("Venta %s eliminada y stock revertido exitosamente", id),
	})
}
