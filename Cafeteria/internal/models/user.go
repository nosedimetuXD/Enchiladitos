package models

import (
	"time"

	"github.com/google/uuid"
)

type UserRole string

const (
	RoleOwner    UserRole = "owner"
	RoleAdmin    UserRole = "admin"
	RoleEmployee UserRole = "employee"
)

type User struct {
	ID        uuid.UUID  `json:"id"`
	Username  string     `json:"username"`
	Role      UserRole   `json:"role"`
	CreatedBy *uuid.UUID `json:"created_by,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
	IsPrimary bool       `json:"is_primary"`
}
