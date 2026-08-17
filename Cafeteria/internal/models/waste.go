package models

import (
	"time"

	"github.com/google/uuid"
)

type WasteReport struct {
	ID             uuid.UUID `json:"id"`
	IngredientID   uuid.UUID `json:"ingredient_id"`
	IngredientName string    `json:"ingredient_name,omitempty"`
	Unit           string    `json:"unit,omitempty"`
	QuantityLost   float64   `json:"quantity_lost"`
	Reason         string    `json:"reason"`
	ReportedBy     uuid.UUID `json:"reported_by"`
	ReporterName   string    `json:"reporter_name,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
}
