package auth

import (
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"github.com/NosedimetuXD/cafeteria/internal/models"
)

// issuer/audience acotan el token a esta API. No cambian el modelo de confianza (el
// secreto sigue siendo lo que protege el token), pero endurecen el parseo: un token
// válido para otro servicio que compartiera el mismo secreto por error no sería aceptado.
const (
	tokenIssuer   = "enchiladitos-api"
	tokenAudience = "enchiladitos-frontend"
)

type Claims struct {
	UserID uuid.UUID       `json:"user_id"`
	Role   models.UserRole `json:"role"`
	jwt.RegisteredClaims
}

func GenerateToken(userID uuid.UUID, role models.UserRole) (string, error) {
	secret := os.Getenv("JWT_SECRET")

	claims := Claims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(12 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ID:        uuid.NewString(), // jti — identificador único del token, base para una futura lista de revocación
			Issuer:    tokenIssuer,
			Audience:  jwt.ClaimStrings{tokenAudience},
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func ParseToken(tokenString string) (*Claims, error) {
	secret := os.Getenv("JWT_SECRET")

	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	},
		// Restringe explícitamente el algoritmo aceptado: sin esto, ParseWithClaims
		// confía en el "alg" declarado por el propio token (incluido "none" o una
		// confusión HS/RS si en el futuro se añadiera una clave pública al keyfunc).
		jwt.WithValidMethods([]string{"HS256"}),
		jwt.WithIssuer(tokenIssuer),
		jwt.WithAudience(tokenAudience),
	)
	if err != nil || !token.Valid {
		return nil, err
	}
	return claims, nil
}
