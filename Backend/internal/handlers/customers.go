package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/NosedimetuXD/cafeteria/internal/models"
)

type CustomerHandler struct {
	DB *pgxpool.Pool
}

func NewCustomerHandler(db *pgxpool.Pool) *CustomerHandler {
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
	`)

	return &CustomerHandler{DB: db}
}

// GET /customers
func (h *CustomerHandler) List(w http.ResponseWriter, r *http.Request) {
	search := strings.TrimSpace(r.URL.Query().Get("search"))

	var rows pgx.Rows
	var err error

	if search != "" {
		searchPattern := "%" + search + "%"
		query := `SELECT id, first_name, COALESCE(last_name, ''), COALESCE(phone, ''), COALESCE(email, ''), COALESCE(notes, ''), created_at, updated_at
		          FROM customers
		          WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1
		          ORDER BY first_name ASC, last_name ASC`
		rows, err = h.DB.Query(r.Context(), query, searchPattern)
	} else {
		query := `SELECT id, first_name, COALESCE(last_name, ''), COALESCE(phone, ''), COALESCE(email, ''), COALESCE(notes, ''), created_at, updated_at
		          FROM customers
		          ORDER BY first_name ASC, last_name ASC`
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
		if err := rows.Scan(&c.ID, &c.FirstName, &c.LastName, &c.Phone, &c.Email, &c.Notes, &c.CreatedAt, &c.UpdatedAt); err != nil {
			log.Printf("error leyendo cliente: %v", err)
			http.Error(w, "error leyendo cliente", http.StatusInternalServerError)
			return
		}
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
	err = h.DB.QueryRow(r.Context(),
		`SELECT id, first_name, COALESCE(last_name, ''), COALESCE(phone, ''), COALESCE(email, ''), COALESCE(notes, ''), created_at, updated_at
		 FROM customers WHERE id = $1`, id,
	).Scan(&c.ID, &c.FirstName, &c.LastName, &c.Phone, &c.Email, &c.Notes, &c.CreatedAt, &c.UpdatedAt)

	if errors.Is(err, pgx.ErrNoRows) {
		http.Error(w, "cliente no encontrado", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("error consultando cliente: %v", err)
		http.Error(w, "error interno", http.StatusInternalServerError)
		return
	}

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
		http.Error(w, "el nombre del cliente es obligatorio", http.StatusBadRequest)
		return
	}

	lastName := strings.TrimSpace(req.LastName)
	phone := strings.TrimSpace(req.Phone)
	email := strings.TrimSpace(req.Email)
	notes := strings.TrimSpace(req.Notes)

	var c models.Customer
	err := h.DB.QueryRow(r.Context(),
		`INSERT INTO customers (first_name, last_name, phone, email, notes)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, first_name, last_name, phone, email, notes, created_at, updated_at`,
		firstName, lastName, phone, email, notes,
	).Scan(&c.ID, &c.FirstName, &c.LastName, &c.Phone, &c.Email, &c.Notes, &c.CreatedAt, &c.UpdatedAt)

	if err != nil {
		log.Printf("error creando cliente: %v", err)
		http.Error(w, "error creando cliente", http.StatusInternalServerError)
		return
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
		http.Error(w, "el nombre del cliente es obligatorio", http.StatusBadRequest)
		return
	}

	lastName := strings.TrimSpace(req.LastName)
	phone := strings.TrimSpace(req.Phone)
	email := strings.TrimSpace(req.Email)
	notes := strings.TrimSpace(req.Notes)

	var c models.Customer
	err = h.DB.QueryRow(r.Context(),
		`UPDATE customers
		 SET first_name = $1, last_name = $2, phone = $3, email = $4, notes = $5, updated_at = now()
		 WHERE id = $6
		 RETURNING id, first_name, last_name, phone, email, notes, created_at, updated_at`,
		firstName, lastName, phone, email, notes, id,
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

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": fmt.Sprintf("Cliente %s eliminado exitosamente", id),
	})
}
