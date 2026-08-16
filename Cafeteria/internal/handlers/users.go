package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
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

type updateUserRequest struct {
	Username string          `json:"username"`
	Password string          `json:"password,omitempty"`
	Role     models.UserRole `json:"role"`
}

// PUT /users/{id}
func (h *UserHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id de usuario inválido", http.StatusBadRequest)
		return
	}

	var req updateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "cuerpo inválido", http.StatusBadRequest)
		return
	}

	username := strings.TrimSpace(req.Username)
	if username == "" {
		http.Error(w, "el nombre de usuario es obligatorio", http.StatusBadRequest)
		return
	}

	switch req.Role {
	case models.RoleOwner, models.RoleAdmin, models.RoleEmployee:
		// rol válido
	default:
		http.Error(w, "rol inválido, debe ser owner, admin o employee", http.StatusBadRequest)
		return
	}

	// Protección por UUID: El rol del usuario principal (primer dueño creado) no se puede cambiar
	var primaryOwnerID uuid.UUID
	_ = h.DB.QueryRow(r.Context(), `SELECT id FROM users WHERE role = 'owner' ORDER BY created_at ASC LIMIT 1`).Scan(&primaryOwnerID)

	if id == primaryOwnerID && req.Role != models.RoleOwner {
		http.Error(w, "El rol del dueño principal está protegido y no se puede modificar", http.StatusForbidden)
		return
	}

	var user models.User
	if strings.TrimSpace(req.Password) != "" {
		if len(req.Password) < 8 {
			http.Error(w, "la contraseña debe tener al menos 8 caracteres", http.StatusBadRequest)
			return
		}

		hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			log.Printf("error generando hash: %v", err)
			http.Error(w, "error interno", http.StatusInternalServerError)
			return
		}

		err = h.DB.QueryRow(r.Context(),
			`UPDATE users
			 SET username = $1, password_hash = $2, role = $3
			 WHERE id = $4
			 RETURNING id, username, role, created_by, created_at`,
			username, string(hash), req.Role, id,
		).Scan(&user.ID, &user.Username, &user.Role, &user.CreatedBy, &user.CreatedAt)
	} else {
		err = h.DB.QueryRow(r.Context(),
			`UPDATE users
			 SET username = $1, role = $2
			 WHERE id = $3
			 RETURNING id, username, role, created_by, created_at`,
			username, req.Role, id,
		).Scan(&user.ID, &user.Username, &user.Role, &user.CreatedBy, &user.CreatedAt)
	}

	if errors.Is(err, pgx.ErrNoRows) {
		http.Error(w, "usuario no encontrado", http.StatusNotFound)
		return
	}
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			http.Error(w, "ese nombre de usuario ya está en uso", http.StatusConflict)
			return
		}
		log.Printf("error actualizando usuario: %v", err)
		http.Error(w, "error actualizando usuario", http.StatusInternalServerError)
		return
	}

	user.IsPrimary = (user.ID == primaryOwnerID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

// GET /users
func (h *UserHandler) List(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(r.Context(),
		`SELECT id, username, role, created_by, created_at,
		        (id = (SELECT id FROM users WHERE role = 'owner' ORDER BY created_at ASC LIMIT 1)) AS is_primary
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
		if err := rows.Scan(&u.ID, &u.Username, &u.Role, &u.CreatedBy, &u.CreatedAt, &u.IsPrimary); err != nil {
			log.Printf("error leyendo usuarios: %v", err)
			http.Error(w, "error leyendo usuarios", http.StatusInternalServerError)
			return
		}
		users = append(users, u)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

type updateSelfRequest struct {
	Username string `json:"username"`
	Password string `json:"password,omitempty"`
}

// PUT /users/me - Permite a cualquier usuario autenticado actualizar su propio nombre y contraseña
func (h *UserHandler) UpdateSelf(w http.ResponseWriter, r *http.Request) {
	userVal := r.Context().Value(custommw.ContextUserID)
	if userVal == nil {
		http.Error(w, "no autenticado", http.StatusUnauthorized)
		return
	}

	var id uuid.UUID
	if val, ok := userVal.(uuid.UUID); ok {
		id = val
	} else if valStr, ok := userVal.(string); ok {
		id, _ = uuid.Parse(valStr)
	}

	var req updateSelfRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "cuerpo inválido", http.StatusBadRequest)
		return
	}

	username := strings.TrimSpace(req.Username)
	if username == "" {
		http.Error(w, "el nombre de usuario es obligatorio", http.StatusBadRequest)
		return
	}

	var user models.User
	var queryErr error

	if strings.TrimSpace(req.Password) != "" {
		if len(req.Password) < 8 {
			http.Error(w, "la contraseña debe tener al menos 8 caracteres", http.StatusBadRequest)
			return
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			log.Printf("error generando hash: %v", err)
			http.Error(w, "error interno", http.StatusInternalServerError)
			return
		}

		queryErr = h.DB.QueryRow(r.Context(),
			`UPDATE users SET username = $1, password_hash = $2 WHERE id = $3 RETURNING id, username, role, created_by, created_at`,
			username, string(hash), id,
		).Scan(&user.ID, &user.Username, &user.Role, &user.CreatedBy, &user.CreatedAt)
	} else {
		queryErr = h.DB.QueryRow(r.Context(),
			`UPDATE users SET username = $1 WHERE id = $2 RETURNING id, username, role, created_by, created_at`,
			username, id,
		).Scan(&user.ID, &user.Username, &user.Role, &user.CreatedBy, &user.CreatedAt)
	}

	if errors.Is(queryErr, pgx.ErrNoRows) {
		http.Error(w, "usuario no encontrado", http.StatusNotFound)
		return
	}
	if queryErr != nil {
		var pgErr *pgconn.PgError
		if errors.As(queryErr, &pgErr) && pgErr.Code == "23505" {
			http.Error(w, "ese nombre de usuario ya está en uso", http.StatusConflict)
			return
		}
		log.Printf("error actualizando perfil: %v", queryErr)
		http.Error(w, "error actualizando perfil", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

// DELETE /users/{id} - Permite únicamente al Dueño eliminar usuarios (salvo el dueño principal)
func (h *UserHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id de usuario inválido", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	var primaryOwnerID uuid.UUID
	_ = h.DB.QueryRow(ctx, `SELECT id FROM users WHERE role = 'owner' ORDER BY created_at ASC LIMIT 1`).Scan(&primaryOwnerID)

	if id == primaryOwnerID {
		http.Error(w, "El dueño principal está protegido permanentemente y no se puede eliminar", http.StatusForbidden)
		return
	}

	// No permitir que el usuario se elimine a sí mismo
	userVal := ctx.Value(custommw.ContextUserID)
	if userVal != nil {
		var currentID uuid.UUID
		if val, ok := userVal.(uuid.UUID); ok {
			currentID = val
		} else if valStr, ok := userVal.(string); ok {
			currentID, _ = uuid.Parse(valStr)
		}
		if id == currentID {
			http.Error(w, "No puedes eliminar tu propio usuario activo", http.StatusBadRequest)
			return
		}
	}

	tx, err := h.DB.Begin(ctx)
	if err != nil {
		log.Printf("error iniciando transacción de borrado de usuario: %v", err)
		http.Error(w, "error interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(ctx)

	// Desvincular referencias de clave foránea para preservar el historial contable/operativo intacto
	_, _ = tx.Exec(ctx, `UPDATE sales SET sold_by = NULL WHERE sold_by = $1`, id)
	_, _ = tx.Exec(ctx, `UPDATE expenses SET registered_by = NULL WHERE registered_by = $1`, id)
	_, _ = tx.Exec(ctx, `UPDATE tasks SET assigned_to = NULL WHERE assigned_to = $1`, id)
	_, _ = tx.Exec(ctx, `UPDATE tasks SET created_by = $2 WHERE created_by = $1`, id, primaryOwnerID)
	_, _ = tx.Exec(ctx, `UPDATE users SET created_by = $2 WHERE created_by = $1`, id, primaryOwnerID)

	tag, err := tx.Exec(ctx, `DELETE FROM users WHERE id = $1`, id)
	if err != nil {
		log.Printf("error eliminando usuario: %v", err)
		http.Error(w, "error eliminando usuario", http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		http.Error(w, "usuario no encontrado", http.StatusNotFound)
		return
	}

	if err := tx.Commit(ctx); err != nil {
		log.Printf("error confirmando eliminación de usuario: %v", err)
		http.Error(w, "error interno", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
