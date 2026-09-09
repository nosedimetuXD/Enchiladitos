package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/NosedimetuXD/cafeteria/internal/models"
)

func withRole(role models.UserRole) context.Context {
	return context.WithValue(context.Background(), ContextRole, role)
}

func TestRequireRole_AllowsListedRole(t *testing.T) {
	called := false
	h := RequireRole(models.RoleOwner, models.RoleAdmin)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/expenses", nil).WithContext(withRole(models.RoleAdmin))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if !called {
		t.Fatal("se esperaba que el handler interno se ejecutara para un rol permitido")
	}
	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", rec.Code)
	}
}

func TestRequireRole_DeniesUnlistedRole(t *testing.T) {
	called := false
	h := RequireRole(models.RoleOwner, models.RoleAdmin)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
	}))

	// Caso que motivó A-01: un "employee" no debe poder ejecutar acciones de owner/admin
	// (p. ej. borrar un cliente o entrar a /accounting/summary).
	req := httptest.NewRequest(http.MethodGet, "/expenses", nil).WithContext(withRole(models.RoleEmployee))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if called {
		t.Fatal("no se esperaba que el handler interno se ejecutara para un rol no permitido")
	}
	if rec.Code != http.StatusForbidden {
		t.Errorf("status = %d, want 403", rec.Code)
	}
}

func TestRequireRole_DeniesWhenNoRoleInContext(t *testing.T) {
	called := false
	h := RequireRole(models.RoleOwner)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
	}))

	req := httptest.NewRequest(http.MethodGet, "/expenses", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if called {
		t.Fatal("no se esperaba que el handler interno se ejecutara sin rol en el contexto")
	}
	if rec.Code != http.StatusForbidden {
		t.Errorf("status = %d, want 403", rec.Code)
	}
}

func TestRequireAuth_RejectsMissingToken(t *testing.T) {
	called := false
	h := RequireAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
	}))

	req := httptest.NewRequest(http.MethodGet, "/products", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if called {
		t.Fatal("no se esperaba que el handler interno se ejecutara sin Authorization")
	}
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want 401", rec.Code)
	}
}

func TestRequireAuth_RejectsInvalidToken(t *testing.T) {
	t.Setenv("JWT_SECRET", "test-secret")
	called := false
	h := RequireAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
	}))

	req := httptest.NewRequest(http.MethodGet, "/products", nil)
	req.Header.Set("Authorization", "Bearer token-invalido")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if called {
		t.Fatal("no se esperaba que el handler interno se ejecutara con un token inválido")
	}
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want 401", rec.Code)
	}
}
