package models

import "github.com/google/uuid"

type RecipeLine struct {
	IngredientID   uuid.UUID `json:"ingredient_id"`
	IngredientName string    `json:"ingredient_name,omitempty"`
	QuantityUsed   float64   `json:"quantity_used"`
}
