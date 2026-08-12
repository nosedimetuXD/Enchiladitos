package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"

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

// GET /sales
func (h *SaleHandler) List(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(r.Context(),
		`SELECT id, sold_by, total, created_at FROM sales ORDER BY created_at DESC`)
	if err != nil {
		log.Printf("error consultando ventas: %v", err)
		http.Error(w, "error consultando ventas", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var sales []models.Sale
	for rows.Next() {
		var s models.Sale
		if err := rows.Scan(&s.ID, &s.SoldBy, &s.Total, &s.CreatedAt); err != nil {
			log.Printf("error leyendo ventas: %v", err)
			http.Error(w, "error leyendo ventas", http.StatusInternalServerError)
			return
		}
		sales = append(sales, s)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(sales)
}

// GET /sales/{id} — incluye los items de esa venta
func (h *SaleHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	var s models.Sale
	err = h.DB.QueryRow(r.Context(),
		`SELECT id, sold_by, total, created_at FROM sales WHERE id = $1`, id,
	).Scan(&s.ID, &s.SoldBy, &s.Total, &s.CreatedAt)
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
		`SELECT product_id, quantity, unit_price FROM sale_items WHERE sale_id = $1`, id)
	if err != nil {
		log.Printf("error consultando items: %v", err)
		http.Error(w, "error consultando items", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var item models.SaleItem
		if err := rows.Scan(&item.ProductID, &item.Quantity, &item.UnitPrice); err != nil {
			log.Printf("error leyendo items: %v", err)
			http.Error(w, "error leyendo items", http.StatusInternalServerError)
			return
		}
		s.Items = append(s.Items, item)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(s)
}

// POST /sales — la pieza importante: crea la venta y descuenta insumos, todo en una transacción
type createSaleRequest struct {
	Items []struct {
		ProductID uuid.UUID `json:"product_id"`
		Quantity  int       `json:"quantity"`
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

	ctx := r.Context()
	soldBy := ctx.Value(custommw.ContextUserID)

	tx, err := h.DB.Begin(ctx)
	if err != nil {
		log.Printf("error iniciando transacción: %v", err)
		http.Error(w, "error interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(ctx) // si no se hace Commit, esto revierte todo automáticamente

	var total float64
	type resolvedItem struct {
		ProductID uuid.UUID
		Quantity  int
		UnitPrice float64
	}
	var resolved []resolvedItem

	// 1. Verificar que cada producto existe y está activo, calcular el total
	for _, item := range req.Items {
		var price float64
		var active bool
		err := tx.QueryRow(ctx,
			`SELECT price, active FROM products WHERE id = $1`, item.ProductID,
		).Scan(&price, &active)
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
			http.Error(w, fmt.Sprintf("producto %s no está disponible", item.ProductID), http.StatusBadRequest)
			return
		}

		total += price * float64(item.Quantity)
		resolved = append(resolved, resolvedItem{item.ProductID, item.Quantity, price})
	}

	// 2. Verificar y descontar insumos según la receta de cada producto
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
				// o no existe el insumo, o no había suficiente stock
				http.Error(w, "no hay suficiente inventario para completar la venta", http.StatusConflict)
				return
			}
		}
	}

	// 3. Crear la venta
	var saleID uuid.UUID
	err = tx.QueryRow(ctx,
		`INSERT INTO sales (sold_by, total) VALUES ($1, $2) RETURNING id`,
		soldBy, total,
	).Scan(&saleID)
	if err != nil {
		log.Printf("error creando venta: %v", err)
		http.Error(w, "error interno", http.StatusInternalServerError)
		return
	}

	// 4. Crear los items de la venta
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

	// 5. Confirmar todo junto
	if err := tx.Commit(ctx); err != nil {
		log.Printf("error confirmando venta: %v", err)
		http.Error(w, "error interno", http.StatusInternalServerError)
		return
	}

	h.Hub.Publish("sale_created", map[string]interface{}{
		"id":    saleID,
		"total": total,
	})

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":    saleID,
		"total": total,
	})
}
