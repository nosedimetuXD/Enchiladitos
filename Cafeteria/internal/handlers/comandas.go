package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/NosedimetuXD/cafeteria/internal/events"
	"github.com/NosedimetuXD/cafeteria/internal/models"
)

type ComandaHandler struct {
	DB  *pgxpool.Pool
	Hub *events.Hub
}

func NewComandaHandler(db *pgxpool.Pool, hub *events.Hub) *ComandaHandler {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, _ = db.Exec(ctx, `ALTER TABLE comandas ADD COLUMN IF NOT EXISTS ready_at TIMESTAMP WITH TIME ZONE`)
	return &ComandaHandler{DB: db, Hub: hub}
}

// GET /comandas
func (h *ComandaHandler) List(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(r.Context(),
		`SELECT id, order_number, sale_id, customer_name, status, notes, created_at, updated_at, ready_at 
		 FROM comandas 
		 WHERE created_at >= (now() - INTERVAL '12 hours') OR status IN ('pendiente', 'en_preparacion', 'listo')
		 ORDER BY CASE status 
		    WHEN 'pendiente' THEN 1 
		    WHEN 'en_preparacion' THEN 2 
		    WHEN 'listo' THEN 3 
		    WHEN 'entregado' THEN 4 
		    WHEN 'cancelado' THEN 5 
		    ELSE 6 END, created_at DESC`)
	if err != nil {
		log.Printf("error consultando comandas: %v", err)
		http.Error(w, "error consultando comandas", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var comandas []models.Comanda
	for rows.Next() {
		var c models.Comanda
		if err := rows.Scan(&c.ID, &c.OrderNumber, &c.SaleID, &c.CustomerName, &c.Status, &c.Notes, &c.CreatedAt, &c.UpdatedAt, &c.ReadyAt); err != nil {
			log.Printf("error leyendo comanda: %v", err)
			http.Error(w, "error leyendo comanda", http.StatusInternalServerError)
			return
		}
		comandas = append(comandas, c)
	}

	// Cargar los items de cada comanda
	for i := range comandas {
		itemRows, err := h.DB.Query(r.Context(),
			`SELECT product_id, product_name, quantity, notes 
			 FROM comanda_items 
			 WHERE comanda_id = $1`, comandas[i].ID)
		if err != nil {
			log.Printf("error cargando items de comanda %s: %v", comandas[i].ID, err)
			continue
		}

		for itemRows.Next() {
			var ci models.ComandaItem
			if err := itemRows.Scan(&ci.ProductID, &ci.ProductName, &ci.Quantity, &ci.Notes); err == nil {
				comandas[i].Items = append(comandas[i].Items, ci)
			}
		}
		itemRows.Close()
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(comandas)
}

// PATCH /comandas/{id}/status
type updateComandaStatusRequest struct {
	Status string `json:"status"`
}

func (h *ComandaHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	var req updateComandaStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "cuerpo inválido", http.StatusBadRequest)
		return
	}

	statusStr := strings.ToLower(strings.TrimSpace(req.Status))
	validStatuses := map[string]bool{
		"pendiente":      true,
		"en_preparacion": true,
		"listo":          true,
		"entregado":      true,
		"cancelado":      true,
	}

	if !validStatuses[statusStr] {
		http.Error(w, "estado de comanda inválido", http.StatusBadRequest)
		return
	}

	var c models.Comanda
	if statusStr == "listo" || statusStr == "entregado" {
		err = h.DB.QueryRow(r.Context(),
			`UPDATE comandas 
			 SET status = $1, updated_at = now(), ready_at = COALESCE(ready_at, now()) 
			 WHERE id = $2 
			 RETURNING id, order_number, sale_id, customer_name, status, notes, created_at, updated_at, ready_at`,
			statusStr, id,
		).Scan(&c.ID, &c.OrderNumber, &c.SaleID, &c.CustomerName, &c.Status, &c.Notes, &c.CreatedAt, &c.UpdatedAt, &c.ReadyAt)
	} else {
		err = h.DB.QueryRow(r.Context(),
			`UPDATE comandas 
			 SET status = $1, updated_at = now() 
			 WHERE id = $2 
			 RETURNING id, order_number, sale_id, customer_name, status, notes, created_at, updated_at, ready_at`,
			statusStr, id,
		).Scan(&c.ID, &c.OrderNumber, &c.SaleID, &c.CustomerName, &c.Status, &c.Notes, &c.CreatedAt, &c.UpdatedAt, &c.ReadyAt)
	}

	if errors.Is(err, pgx.ErrNoRows) {
		http.Error(w, "comanda no encontrada", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("error actualizando estado de comanda: %v", err)
		http.Error(w, "error interno", http.StatusInternalServerError)
		return
	}

	h.Hub.Publish("comanda_updated", map[string]interface{}{
		"id":           c.ID,
		"order_number": c.OrderNumber,
		"status":       c.Status,
		"updated_at":   c.UpdatedAt,
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(c)
}
