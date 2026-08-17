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
	custommw "github.com/NosedimetuXD/cafeteria/internal/middleware"
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
	_, _ = db.Exec(ctx, `ALTER TABLE comandas ADD COLUMN IF NOT EXISTS prepared_by UUID REFERENCES users(id)`)
	_, _ = db.Exec(ctx, `ALTER TABLE comandas ADD COLUMN IF NOT EXISTS prepared_by_username VARCHAR(100)`)
	return &ComandaHandler{DB: db, Hub: hub}
}

// GET /comandas
func (h *ComandaHandler) List(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(r.Context(),
		`SELECT c.id, c.order_number, COALESCE(c.sale_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(c.customer_name, ''), c.status, COALESCE(c.notes, ''), c.created_at, c.updated_at, c.ready_at, c.prepared_by, COALESCE(NULLIF(c.prepared_by_username, ''), u.username, '') 
		 FROM comandas c
		 LEFT JOIN users u ON c.prepared_by = u.id
		 WHERE c.created_at >= (now() - INTERVAL '12 hours') OR c.status IN ('pendiente', 'en_preparacion', 'listo')
		 ORDER BY CASE c.status 
		    WHEN 'pendiente' THEN 1 
		    WHEN 'en_preparacion' THEN 2 
		    WHEN 'listo' THEN 3 
		    WHEN 'entregado' THEN 4 
		    WHEN 'cancelado' THEN 5 
		    ELSE 6 END, c.created_at DESC`)
	if err != nil {
		log.Printf("error consultando comandas: %v", err)
		http.Error(w, "error consultando comandas", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var comandas []models.Comanda
	for rows.Next() {
		var c models.Comanda
		if err := rows.Scan(&c.ID, &c.OrderNumber, &c.SaleID, &c.CustomerName, &c.Status, &c.Notes, &c.CreatedAt, &c.UpdatedAt, &c.ReadyAt, &c.PreparedBy, &c.PreparedByUsername); err != nil {
			log.Printf("error leyendo comanda: %v", err)
			http.Error(w, "error leyendo comanda", http.StatusInternalServerError)
			return
		}
		comandas = append(comandas, c)
	}

	// Cargar los items de cada comanda
	for i := range comandas {
		itemRows, err := h.DB.Query(r.Context(),
			`SELECT product_id, product_name, quantity, COALESCE(notes, '') 
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

	userIDVal := r.Context().Value(custommw.ContextUserID)

	var userID *uuid.UUID
	if idVal, ok := userIDVal.(uuid.UUID); ok {
		userID = &idVal
	} else if idStr, ok := userIDVal.(string); ok {
		if parsed, pErr := uuid.Parse(idStr); pErr == nil {
			userID = &parsed
		}
	}

	var unameStr string
	if userID != nil {
		_ = h.DB.QueryRow(r.Context(), "SELECT username FROM users WHERE id = $1", *userID).Scan(&unameStr)
	}

	var c models.Comanda
	// Intento 1: Actualizar con columnas prepared_by
	err = h.DB.QueryRow(r.Context(),
		`UPDATE comandas 
		 SET status = $1, 
		     updated_at = now(), 
		     ready_at = COALESCE(ready_at, CASE WHEN $1 IN ('listo', 'entregado') THEN now() ELSE NULL END),
		     prepared_by = COALESCE(prepared_by, $3::uuid),
		     prepared_by_username = COALESCE(NULLIF(prepared_by_username, ''), NULLIF($4, ''))
		 WHERE id = $2 
		 RETURNING id, order_number, COALESCE(sale_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(customer_name, ''), status, COALESCE(notes, ''), created_at, updated_at, ready_at, prepared_by, COALESCE(prepared_by_username, '')`,
		statusStr, id, userID, unameStr,
	).Scan(&c.ID, &c.OrderNumber, &c.SaleID, &c.CustomerName, &c.Status, &c.Notes, &c.CreatedAt, &c.UpdatedAt, &c.ReadyAt, &c.PreparedBy, &c.PreparedByUsername)

	// Intento 2: Fallback si prepared_by no existe aún en DB
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		log.Printf("intentando fallback update status sin prepared_by debido a: %v", err)
		err = h.DB.QueryRow(r.Context(),
			`UPDATE comandas 
			 SET status = $1, 
			     updated_at = now(), 
			     ready_at = COALESCE(ready_at, CASE WHEN $1 IN ('listo', 'entregado') THEN now() ELSE NULL END)
			 WHERE id = $2 
			 RETURNING id, order_number, COALESCE(sale_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(customer_name, ''), status, COALESCE(notes, ''), created_at, updated_at, ready_at`,
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
