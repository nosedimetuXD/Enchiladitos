package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/NosedimetuXD/cafeteria/internal/events"
	"github.com/NosedimetuXD/cafeteria/internal/models"
)

type IngredientHandler struct {
	DB  *pgxpool.Pool
	Hub *events.Hub
}

func NewIngredientHandler(db *pgxpool.Pool, hub *events.Hub) *IngredientHandler {
	return &IngredientHandler{DB: db, Hub: hub}
}

// GET /ingredients
func (h *IngredientHandler) List(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(r.Context(),
		`SELECT id, name, unit, quantity, min_threshold, created_at, updated_at
		 FROM ingredients ORDER BY name`)
	if err != nil {
		log.Printf("error consultando insumos: %v", err)
		http.Error(w, "error consultando insumos", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var ingredients []models.Ingredient
	for rows.Next() {
		var i models.Ingredient
		if err := rows.Scan(&i.ID, &i.Name, &i.Unit, &i.Quantity, &i.MinThreshold, &i.CreatedAt, &i.UpdatedAt); err != nil {
			log.Printf("error leyendo insumos: %v", err)
			http.Error(w, "error leyendo insumos", http.StatusInternalServerError)
			return
		}
		ingredients = append(ingredients, i)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ingredients)
}

// GET /ingredients/{id}
func (h *IngredientHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	var i models.Ingredient
	err = h.DB.QueryRow(r.Context(),
		`SELECT id, name, unit, quantity, min_threshold, created_at, updated_at
		 FROM ingredients WHERE id = $1`, id,
	).Scan(&i.ID, &i.Name, &i.Unit, &i.Quantity, &i.MinThreshold, &i.CreatedAt, &i.UpdatedAt)

	if errors.Is(err, pgx.ErrNoRows) {
		http.Error(w, "insumo no encontrado", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("error consultando insumo: %v", err)
		http.Error(w, "error consultando insumo", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(i)
}

// POST /ingredients
type createIngredientRequest struct {
	Name         string   `json:"name"`
	Unit         string   `json:"unit"`
	Quantity     float64  `json:"quantity"`
	MinThreshold *float64 `json:"min_threshold"`
}

func (h *IngredientHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req createIngredientRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "cuerpo inválido", http.StatusBadRequest)
		return
	}
	if req.Name == "" || req.Unit == "" || req.Quantity < 0 {
		http.Error(w, "nombre, unidad y cantidad son obligatorios", http.StatusBadRequest)
		return
	}

	var i models.Ingredient
	err := h.DB.QueryRow(r.Context(),
		`INSERT INTO ingredients (name, unit, quantity, min_threshold)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, name, unit, quantity, min_threshold, created_at, updated_at`,
		req.Name, req.Unit, req.Quantity, req.MinThreshold,
	).Scan(&i.ID, &i.Name, &i.Unit, &i.Quantity, &i.MinThreshold, &i.CreatedAt, &i.UpdatedAt)
	if err != nil {
		log.Printf("error creando insumo: %v", err)
		http.Error(w, "error creando insumo", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(i)
}

// PUT /ingredients/{id}
type updateIngredientRequest struct {
	Name         string   `json:"name"`
	Unit         string   `json:"unit"`
	Quantity     float64  `json:"quantity"`
	MinThreshold *float64 `json:"min_threshold"`
}

func (h *IngredientHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	var req updateIngredientRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "cuerpo inválido", http.StatusBadRequest)
		return
	}
	if req.Name == "" || req.Unit == "" || req.Quantity < 0 {
		http.Error(w, "nombre, unidad y cantidad son obligatorios", http.StatusBadRequest)
		return
	}

	var i models.Ingredient
	err = h.DB.QueryRow(r.Context(),
		`UPDATE ingredients
		 SET name = $1, unit = $2, quantity = $3, min_threshold = $4
		 WHERE id = $5
		 RETURNING id, name, unit, quantity, min_threshold, created_at, updated_at`,
		req.Name, req.Unit, req.Quantity, req.MinThreshold, id,
	).Scan(&i.ID, &i.Name, &i.Unit, &i.Quantity, &i.MinThreshold, &i.CreatedAt, &i.UpdatedAt)

	if errors.Is(err, pgx.ErrNoRows) {
		http.Error(w, "insumo no encontrado", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("error actualizando insumo: %v", err)
		http.Error(w, "error actualizando insumo", http.StatusInternalServerError)
		return
	}

	h.Hub.Publish("inventory_updated", i)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(i)
}

// DELETE /ingredients/{id}
func (h *IngredientHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	tag, err := h.DB.Exec(r.Context(), `DELETE FROM ingredients WHERE id = $1`, id)
	if err != nil {
		log.Printf("error borrando insumo: %v", err)
		http.Error(w, "error borrando insumo", http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		http.Error(w, "insumo no encontrado", http.StatusNotFound)
		return
	}

	h.Hub.Publish("inventory_deleted", map[string]string{"id": id.String()})

	w.WriteHeader(http.StatusNoContent)
}
