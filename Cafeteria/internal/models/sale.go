package models

import (
	"time"

	"github.com/google/uuid"
)

type SaleItem struct {
	ProductID uuid.UUID `json:"product_id"`
	Quantity  int       `json:"quantity"`
	UnitPrice float64   `json:"unit_price"`
}

type Sale struct {
	ID        uuid.UUID  `json:"id"`
	SoldBy    uuid.UUID  `json:"sold_by"`
	Total     float64    `json:"total"`
	CreatedAt time.Time  `json:"created_at"`
	Items     []SaleItem `json:"items,omitempty"`
}
