package auth

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"github.com/NosedimetuXD/cafeteria/internal/models"
)

func withSecret(t *testing.T, secret string) {
	t.Helper()
	t.Setenv("JWT_SECRET", secret)
}

func TestGenerateAndParseToken_RoundTrip(t *testing.T) {
	withSecret(t, "test-secret-12345")

	userID := uuid.New()
	tok, err := GenerateToken(userID, models.RoleOwner)
	if err != nil {
		t.Fatalf("GenerateToken error: %v", err)
	}

	claims, err := ParseToken(tok)
	if err != nil {
		t.Fatalf("ParseToken error inesperado: %v", err)
	}
	if claims.UserID != userID {
		t.Errorf("UserID = %v, want %v", claims.UserID, userID)
	}
	if claims.Role != models.RoleOwner {
		t.Errorf("Role = %v, want %v", claims.Role, models.RoleOwner)
	}
	if claims.ID == "" {
		t.Error("se esperaba un jti (Claims.ID) no vacío")
	}
}

func TestParseToken_RejectsWrongSecret(t *testing.T) {
	withSecret(t, "secret-correcto")
	tok, err := GenerateToken(uuid.New(), models.RoleOwner)
	if err != nil {
		t.Fatalf("GenerateToken error: %v", err)
	}

	withSecret(t, "secret-incorrecto-adivinado")
	if _, err := ParseToken(tok); err == nil {
		t.Error("se esperaba error al parsear un token firmado con otro secreto")
	}
}

func TestParseToken_RejectsAlgNone(t *testing.T) {
	withSecret(t, "test-secret-12345")

	// Construye manualmente un token "alg: none" con claims válidos y firma vacía —
	// la variante clásica de bypass de autenticación JWT.
	claims := Claims{
		UserID: uuid.New(),
		Role:   models.RoleOwner,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
			Issuer:    tokenIssuer,
			Audience:  jwt.ClaimStrings{tokenAudience},
		},
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodNone, claims)
	signed, err := tok.SignedString(jwt.UnsafeAllowNoneSignatureType)
	if err != nil {
		t.Fatalf("no se pudo construir token alg:none de prueba: %v", err)
	}

	if _, err := ParseToken(signed); err == nil {
		t.Error("se esperaba que ParseToken rechazara un token con alg:none")
	}
}

func TestParseToken_RejectsOtherHMACVariant(t *testing.T) {
	withSecret(t, "test-secret-12345")

	// HS384/HS512 con el mismo secreto deben rechazarse: solo HS256 es válido.
	claims := Claims{
		UserID: uuid.New(),
		Role:   models.RoleOwner,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
			Issuer:    tokenIssuer,
			Audience:  jwt.ClaimStrings{tokenAudience},
		},
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS384, claims)
	signed, err := tok.SignedString([]byte("test-secret-12345"))
	if err != nil {
		t.Fatalf("no se pudo firmar token HS384 de prueba: %v", err)
	}

	if _, err := ParseToken(signed); err == nil {
		t.Error("se esperaba que ParseToken rechazara un token HS384 (solo HS256 es válido)")
	}
}

func TestParseToken_RejectsExpired(t *testing.T) {
	withSecret(t, "test-secret-12345")

	claims := Claims{
		UserID: uuid.New(),
		Role:   models.RoleOwner,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(-time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now().Add(-2 * time.Hour)),
			Issuer:    tokenIssuer,
			Audience:  jwt.ClaimStrings{tokenAudience},
		},
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := tok.SignedString([]byte("test-secret-12345"))
	if err != nil {
		t.Fatalf("no se pudo firmar token expirado de prueba: %v", err)
	}

	if _, err := ParseToken(signed); err == nil {
		t.Error("se esperaba que ParseToken rechazara un token expirado")
	}
}

func TestParseToken_RejectsWrongAudience(t *testing.T) {
	withSecret(t, "test-secret-12345")

	claims := Claims{
		UserID: uuid.New(),
		Role:   models.RoleOwner,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
			Issuer:    tokenIssuer,
			Audience:  jwt.ClaimStrings{"otra-app"},
		},
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := tok.SignedString([]byte("test-secret-12345"))
	if err != nil {
		t.Fatalf("no se pudo firmar token de prueba: %v", err)
	}

	if _, err := ParseToken(signed); err == nil {
		t.Error("se esperaba que ParseToken rechazara un token con audience distinta")
	}
}

func TestParseToken_RejectsGarbage(t *testing.T) {
	withSecret(t, "test-secret-12345")
	if _, err := ParseToken("esto-no-es-un-jwt"); err == nil {
		t.Error("se esperaba error al parsear una cadena que no es un JWT")
	}
}
