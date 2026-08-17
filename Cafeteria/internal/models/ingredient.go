package models

import (
	"time"

	"github.com/google/uuid"
)

type Ingredient struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Quantity    float64   `json:"quantity"`
	Unit        string    `json:"unit"`
	MinQuantity float64   `json:"min_quantity"`
	UnitCost    float64   `json:"unit_cost"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
