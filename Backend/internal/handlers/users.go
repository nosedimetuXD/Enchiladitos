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
	"unicode"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"

	custommw "github.com/NosedimetuXD/cafeteria/internal/middleware"
	"github.com/NosedimetuXD/cafeteria/internal/models"
)

// validatePasswordStrength exige una longitud mínima mayor y una mezcla de letras y
// números/símbolos, en vez de aceptar cualquier cadena de 8 caracteres (p. ej. "12345678").
func validatePasswordStrength(pw string) error {
	const minLen = 10
	if len(pw) < minLen {
		return fmt.Errorf("la contraseña debe tener al menos %d caracteres", minLen)
	}
	hasLetter, hasOther := false, false
	for _, r := range pw {
		switch {
		case unicode.IsLetter(r):
			hasLetter = true
		case unicode.IsDigit(r) || unicode.IsPunct(r) || unicode.IsSymbol(r):
			hasOther = true
		}
	}
	if !hasLetter || !hasOther {
		return fmt.Errorf("la contraseña debe combinar letras con números o símbolos")
	}
	return nil
}

type UserHandler struct {
	DB *pgxpool.Pool
}

func NewUserHandler(db *pgxpool.Pool) *UserHandler {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, _ = db.Exec(ctx, `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT ''`)

	return &UserHandler{DB: db}
}

// GET /users/me - Retorna el perfil del usuario autenticado
func (h *UserHandler) GetSelf(w http.ResponseWriter, r *http.Request) {
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

	var user models.User
	err := h.DB.QueryRow(r.Context(),
		`SELECT id, username, COALESCE(role, 'owner'), COALESCE(avatar_url, ''), created_at
		 FROM users WHERE id = $1`, id,
	).Scan(&user.ID, &user.Username, &user.Role, &user.AvatarURL, &user.CreatedAt)

	if errors.Is(err, pgx.ErrNoRows) {
		http.Error(w, "usuario no encontrado", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("error consultando perfil: %v", err)
		http.Error(w, "error interno", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

type updateSelfRequest struct {
	Username  string `json:"username"`
	Password  string `json:"password,omitempty"`
	AvatarURL string `json:"avatar_url,omitempty"`
}

// PUT /users/me - Permite actualizar nombre, contraseña y avatar
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
		if err := validatePasswordStrength(req.Password); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			log.Printf("error generando hash: %v", err)
			http.Error(w, "error interno", http.StatusInternalServerError)
			return
		}

		queryErr = h.DB.QueryRow(r.Context(),
			`UPDATE users SET username = $1, password_hash = $2, avatar_url = $3 WHERE id = $4 
			 RETURNING id, username, role, COALESCE(avatar_url, ''), created_at`,
			username, string(hash), req.AvatarURL, id,
		).Scan(&user.ID, &user.Username, &user.Role, &user.AvatarURL, &user.CreatedAt)
	} else {
		queryErr = h.DB.QueryRow(r.Context(),
			`UPDATE users SET username = $1, avatar_url = $2 WHERE id = $3 
			 RETURNING id, username, role, COALESCE(avatar_url, ''), created_at`,
			username, req.AvatarURL, id,
		).Scan(&user.ID, &user.Username, &user.Role, &user.AvatarURL, &user.CreatedAt)
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
