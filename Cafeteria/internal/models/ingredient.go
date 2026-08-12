package models

import (
	"time"

	"github.com/google/uuid"
)

type Ingredient struct {
	ID           uuid.UUID `json:"id"`
	Name         string    `json:"name"`
	Unit         string    `json:"unit"`
	Quantity     float64   `json:"quantity"`
	MinThreshold *float64  `json:"min_threshold,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}
