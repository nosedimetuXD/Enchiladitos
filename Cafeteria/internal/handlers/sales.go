package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"

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
	return &SaleHandler{DB: db, Hub: hub}
}

// GET /sales?period=today|week|month|all
func (h *SaleHandler) List(w http.ResponseWriter, r *http.Request) {
	period := r.URL.Query().Get("period")
	var timeCondition string

	switch period {
	case "today":
		timeCondition = "WHERE s.created_at >= date_trunc('day', now())"
	case "week":
		timeCondition = "WHERE s.created_at >= date_trunc('week', now())"
	case "month":
		timeCondition = "WHERE s.created_at >= date_trunc('month', now())"
	default:
		timeCondition = ""
	}

	query := fmt.Sprintf(`SELECT s.id, s.sold_by, COALESCE(u.username, ''), COALESCE(s.customer_name, 'Cliente General'), 
		        COALESCE(s.payment_method, 'efectivo'), COALESCE(s.cash_amount, 0), COALESCE(s.transfer_amount, 0), 
		        s.total, s.created_at 
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
		if err := rows.Scan(&s.ID, &s.SoldBy, &s.SoldByUsername, &s.CustomerName,
			&s.PaymentMethod, &s.CashAmount, &s.TransferAmount, &s.Total, &s.CreatedAt); err != nil {
			log.Printf("error leyendo ventas: %v", err)
			http.Error(w, "error leyendo ventas", http.StatusInternalServerError)
			return
		}
		sales = append(sales, s)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(sales)
}

// GET /sales/{id} — incluye los items de esa venta con el nombre del producto
func (h *SaleHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	var s models.Sale
	err = h.DB.QueryRow(r.Context(),
		`SELECT s.id, s.sold_by, COALESCE(u.username, ''), COALESCE(s.customer_name, 'Cliente General'), 
		        COALESCE(s.payment_method, 'efectivo'), COALESCE(s.cash_amount, 0), COALESCE(s.transfer_amount, 0), 
		        s.total, s.created_at 
		 FROM sales s
		 LEFT JOIN users u ON s.sold_by = u.id
		 WHERE s.id = $1`, id,
	).Scan(&s.ID, &s.SoldBy, &s.SoldByUsername, &s.CustomerName,
		&s.PaymentMethod, &s.CashAmount, &s.TransferAmount, &s.Total, &s.CreatedAt)

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
		`SELECT si.product_id, COALESCE(p.name, ''), si.quantity, si.unit_price 
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
			log.Printf("error leyendo items: %v", err)
			http.Error(w, "error leyendo items", http.StatusInternalServerError)
			return
		}
		s.Items = append(s.Items, item)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(s)
}

// POST /sales — crea venta, descuenta insumos y genera comanda en tiempo real
type createSaleRequest struct {
	CustomerName  string  `json:"customer_name"`
	PaymentMethod string  `json:"payment_method"`
	CashAmount    float64 `json:"cash_amount"`
	TransferAmount float64 `json:"transfer_amount"`
	Items         []struct {
		ProductID uuid.UUID `json:"product_id"`
		Quantity  int       `json:"quantity"`
		Notes     string    `json:"notes"`
	} `json:"items"`
}

func (h *SaleHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req createSaleRequest
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
	if paymentMethod != "efectivo" && paymentMethod != "transferencia" && paymentMethod != "mixto" {
		http.Error(w, "método de pago inválido", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	soldByVal := ctx.Value(custommw.ContextUserID)
	var soldBy uuid.UUID
	if soldByVal != nil {
		if id, ok := soldByVal.(uuid.UUID); ok {
			soldBy = id
		} else if idStr, ok := soldByVal.(string); ok {
			soldBy, _ = uuid.Parse(idStr)
		}
	}

	tx, err := h.DB.Begin(ctx)
	if err != nil {
		log.Printf("error iniciando transacción: %v", err)
		http.Error(w, "error interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(ctx)

	var total float64
	type resolvedItem struct {
		ProductID   uuid.UUID
		ProductName string
		Quantity    int
		UnitPrice   float64
		Notes       string
	}
	var resolved []resolvedItem

	// 1. Verificar que cada producto existe, está activo y calcular el total
	for _, item := range req.Items {
		var name string
		var price float64
		var active bool
		err := tx.QueryRow(ctx,
			`SELECT name, price, active FROM products WHERE id = $1`, item.ProductID,
		).Scan(&name, &price, &active)
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, fmt.Sprintf("producto %s no existe", item.ProductID), http.StatusBadRequest)
			return
		}
		if err != nil {
			log.Printf("error consultando producto: %v", err)
			http.Error(w, "error interno", http.StatusInternalServerError)
			return
		}
		if !active {
			http.Error(w, fmt.Sprintf("producto %s no está disponible", name), http.StatusBadRequest)
			return
		}

		total += price * float64(item.Quantity)
		resolved = append(resolved, resolvedItem{
			ProductID:   item.ProductID,
			ProductName: name,
			Quantity:    item.Quantity,
			UnitPrice:   price,
			Notes:       item.Notes,
		})
	}

	// Determinar montos abonados según forma de pago
	cashAmount := req.CashAmount
	transferAmount := req.TransferAmount
	if paymentMethod == "efectivo" {
		cashAmount = total
		transferAmount = 0
	} else if paymentMethod == "transferencia" {
		cashAmount = 0
		transferAmount = total
	} else if paymentMethod == "mixto" {
		if cashAmount+transferAmount < total {
			http.Error(w, "el pago total en mixto es inferior al monto de la venta", http.StatusBadRequest)
			return
		}
	}

	// 2. Descontar insumos del inventario según receta
	for _, item := range resolved {
		rows, err := tx.Query(ctx,
			`SELECT ingredient_id, quantity_used FROM product_ingredients WHERE product_id = $1`,
			item.ProductID)
		if err != nil {
			log.Printf("error consultando receta: %v", err)
			http.Error(w, "error interno", http.StatusInternalServerError)
			return
		}

		type recipeLine struct {
			IngredientID uuid.UUID
			QtyUsed      float64
		}
		var recipe []recipeLine
		for rows.Next() {
			var rl recipeLine
			if err := rows.Scan(&rl.IngredientID, &rl.QtyUsed); err != nil {
				rows.Close()
				log.Printf("error leyendo receta: %v", err)
				http.Error(w, "error interno", http.StatusInternalServerError)
				return
			}
			recipe = append(recipe, rl)
		}
		rows.Close()

		for _, rl := range recipe {
			needed := rl.QtyUsed * float64(item.Quantity)
			tag, err := tx.Exec(ctx,
				`UPDATE ingredients SET quantity = quantity - $1
				 WHERE id = $2 AND quantity >= $1`,
				needed, rl.IngredientID)
			if err != nil {
				log.Printf("error descontando insumo: %v", err)
				http.Error(w, "error interno", http.StatusInternalServerError)
				return
			}
			if tag.RowsAffected() == 0 {
				http.Error(w, "no hay suficiente inventario para completar la venta", http.StatusConflict)
				return
			}
		}
	}

	// 3. Insertar la venta
	var saleID uuid.UUID
	err = tx.QueryRow(ctx,
		`INSERT INTO sales (sold_by, total, customer_name, payment_method, cash_amount, transfer_amount) 
		 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
		soldBy, total, customerName, paymentMethod, cashAmount, transferAmount,
	).Scan(&saleID)
	if err != nil {
		log.Printf("error creando venta: %v", err)
		http.Error(w, "error interno", http.StatusInternalServerError)
		return
	}

	// 4. Insertar los items de la venta
	for _, item := range resolved {
		_, err = tx.Exec(ctx,
			`INSERT INTO sale_items (sale_id, product_id, quantity, unit_price)
			 VALUES ($1, $2, $3, $4)`,
			saleID, item.ProductID, item.Quantity, item.UnitPrice)
		if err != nil {
			log.Printf("error creando item de venta: %v", err)
			http.Error(w, "error interno", http.StatusInternalServerError)
			return
		}
	}

	// 5. Crear la Comanda (Kitchen ticket) automáticamente
	var comandaID uuid.UUID
	var orderNumber int
	err = tx.QueryRow(ctx,
		`INSERT INTO comandas (sale_id, customer_name, status, notes) 
		 VALUES ($1, $2, 'pendiente', '') RETURNING id, order_number`,
		saleID, customerName,
	).Scan(&comandaID, &orderNumber)
	if err != nil {
		log.Printf("error generando comanda: %v", err)
		http.Error(w, "error interno generando comanda", http.StatusInternalServerError)
		return
	}

	var comandaItems []models.ComandaItem
	for _, item := range resolved {
		_, err = tx.Exec(ctx,
			`INSERT INTO comanda_items (comanda_id, product_id, product_name, quantity, notes)
			 VALUES ($1, $2, $3, $4, $5)`,
			comandaID, item.ProductID, item.ProductName, item.Quantity, item.Notes)
		if err != nil {
			log.Printf("error registrando item de comanda: %v", err)
			http.Error(w, "error interno registrando comanda", http.StatusInternalServerError)
			return
		}
		comandaItems = append(comandaItems, models.ComandaItem{
			ProductID:   item.ProductID,
			ProductName: item.ProductName,
			Quantity:    item.Quantity,
			Notes:       item.Notes,
		})
	}

	// 6. Confirmar la transacción
	if err := tx.Commit(ctx); err != nil {
		log.Printf("error confirmando venta y comanda: %v", err)
		http.Error(w, "error interno", http.StatusInternalServerError)
		return
	}

	// Notificar vía eventos SSE
	h.Hub.Publish("sale_created", map[string]interface{}{
		"id":              saleID,
		"customer_name":   customerName,
		"payment_method":  paymentMethod,
		"total":           total,
	})

	h.Hub.Publish("comanda_created", map[string]interface{}{
		"id":            comandaID,
		"order_number":  orderNumber,
		"sale_id":       saleID,
		"customer_name": customerName,
		"status":        "pendiente",
		"items":         comandaItems,
	})

	// Publicar actualización de inventario también
	h.Hub.Publish("inventory_updated", map[string]interface{}{"action": "sale_deduction"})

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":            saleID,
		"comanda_id":    comandaID,
		"order_number":  orderNumber,
		"customer_name": customerName,
		"total":         total,
	})
}
