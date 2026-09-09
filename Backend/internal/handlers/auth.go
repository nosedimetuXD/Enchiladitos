package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"

	"github.com/NosedimetuXD/cafeteria/internal/auth"
	"github.com/NosedimetuXD/cafeteria/internal/models"
)

type AuthHandler struct {
	DB *pgxpool.Pool
}

func NewAuthHandler(db *pgxpool.Pool) *AuthHandler {
	return &AuthHandler{DB: db}
}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type loginResponse struct {
	Token string      `json:"token"`
	User  models.User `json:"user"`
}

// dummyPasswordHash es un hash bcrypt válido de una contraseña que nadie usa. Se compara
// contra él cuando el usuario no existe, para que el tiempo de respuesta de un intento de
// login con usuario inexistente sea indistinguible del de un usuario existente con
// contraseña incorrecta (evita enumeración de usuarios por canal de tiempo).
const dummyPasswordHash = "$2a$10$lK4gY/xXmZbu9QTCrW7KRO8VxKJ6baEGt3wvPUCb2BxisMZIX9wNW"

// POST /login
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "cuerpo inválido", http.StatusBadRequest)
		return
	}

	var user models.User
	passwordHash := dummyPasswordHash
	err := h.DB.QueryRow(r.Context(),
		`SELECT id, username, role, COALESCE(avatar_url, ''), password_hash, created_at
		 FROM users WHERE LOWER(username) = LOWER($1)`, req.Username,
	).Scan(&user.ID, &user.Username, &user.Role, &user.AvatarURL, &passwordHash, &user.CreatedAt)

	userExists := true
	if errors.Is(err, pgx.ErrNoRows) {
		userExists = false
		passwordHash = dummyPasswordHash
	} else if err != nil {
		log.Printf("error consultando usuario: %v", err)
		http.Error(w, "error interno", http.StatusInternalServerError)
		return
	}

	// Se ejecuta siempre, exista o no el usuario, para mantener un tiempo de respuesta
	// constante (ver dummyPasswordHash).
	pwErr := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password))
	if !userExists || pwErr != nil {
		http.Error(w, "usuario o contraseña incorrectos", http.StatusUnauthorized)
		return
	}

	token, err := auth.GenerateToken(user.ID, user.Role)
	if err != nil {
		log.Printf("error generando token: %v", err)
		http.Error(w, "error interno", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(loginResponse{Token: token, User: user})
}
