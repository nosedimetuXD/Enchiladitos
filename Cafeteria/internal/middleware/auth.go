package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/NosedimetuXD/cafeteria/internal/auth"
	"github.com/NosedimetuXD/cafeteria/internal/models"
)

type contextKey string

const (
	ContextUserID contextKey = "user_id"
	ContextRole   contextKey = "role"
)

// RequireAuth valida el JWT y mete el user_id/role en el contexto de la petición
func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if !strings.HasPrefix(authHeader, "Bearer ") {
			http.Error(w, "token requerido", http.StatusUnauthorized)
			return
		}
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		claims, err := auth.ParseToken(tokenString)
		if err != nil {
			http.Error(w, "token inválido o expirado", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), ContextUserID, claims.UserID)
		ctx = context.WithValue(ctx, ContextRole, claims.Role)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequireRole solo deja pasar si el rol del usuario está en la lista permitida
func RequireRole(allowed ...models.UserRole) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			role, ok := r.Context().Value(ContextRole).(models.UserRole)
			if !ok {
				http.Error(w, "no autorizado", http.StatusForbidden)
				return
			}
			for _, a := range allowed {
				if role == a {
					next.ServeHTTP(w, r)
					return
				}
			}
			http.Error(w, "no tienes permiso para esta acción", http.StatusForbidden)
		})
	}
}

// Se usa solo para /events, porque EventSource del navegador no soporta headers custom.
func RequireAuthSSE(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tokenString := r.URL.Query().Get("token")
		if tokenString == "" {
			http.Error(w, "token requerido", http.StatusUnauthorized)
			return
		}

		claims, err := auth.ParseToken(tokenString)
		if err != nil {
			http.Error(w, "token inválido o expirado", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), ContextUserID, claims.UserID)
		ctx = context.WithValue(ctx, ContextRole, claims.Role)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
