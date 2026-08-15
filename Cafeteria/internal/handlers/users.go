package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"

	custommw "github.com/NosedimetuXD/cafeteria/internal/middleware"
	"github.com/NosedimetuXD/cafeteria/internal/models"
)

type UserHandler struct {
	DB *pgxpool.Pool
}

func NewUserHandler(db *pgxpool.Pool) *UserHandler {
	return &UserHandler{DB: db}
}

type createUserRequest struct {
	Username string          `json:"username"`
	Password string          `json:"password"`
	Role     models.UserRole `json:"role"`
}

// POST /users
func (h *UserHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req createUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "cuerpo inválido", http.StatusBadRequest)
		return
	}

	if req.Username == "" || req.Password == "" {
		http.Error(w, "usuario y contraseña son obligatorios", http.StatusBadRequest)
		return
	}
	if len(req.Password) < 8 {
		http.Error(w, "la contraseña debe tener al menos 8 caracteres", http.StatusBadRequest)
		return
	}

	switch req.Role {
	case models.RoleOwner, models.RoleAdmin, models.RoleEmployee:
		// rol válido, sigue
	default:
		http.Error(w, "rol inválido, debe ser owner, admin o employee", http.StatusBadRequest)
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("error generando hash: %v", err)
		http.Error(w, "error interno", http.StatusInternalServerError)
		return
	}

	// quién está creando este usuario (viene del token, gracias a RequireAuth)
	var user models.User
	err = h.DB.QueryRow(r.Context(),
		`INSERT INTO users (username, password_hash, role, created_by)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, username, role, created_by, created_at`,
		req.Username, string(hash), req.Role, r.Context().Value(custommw.ContextUserID),
	).Scan(&user.ID, &user.Username, &user.Role, &user.CreatedBy, &user.CreatedAt)

	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" { // unique_violation
			http.Error(w, "ese nombre de usuario ya existe", http.StatusConflict)
			return
		}
		log.Printf("error creando usuario: %v", err)
		http.Error(w, "error creando usuario", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(user)
}

// GET /users
func (h *UserHandler) List(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(r.Context(),
		`SELECT id, username, role, created_by, created_at
		 FROM users ORDER BY username`)
	if err != nil {
		log.Printf("error consultando usuarios: %v", err)
		http.Error(w, "error consultando usuarios", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.Username, &u.Role, &u.CreatedBy, &u.CreatedAt); err != nil {
			log.Printf("error leyendo usuarios: %v", err)
			http.Error(w, "error leyendo usuarios", http.StatusInternalServerError)
			return
		}
		users = append(users, u)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}
