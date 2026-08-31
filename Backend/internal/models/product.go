package models

import (
	"time"

	"github.com/google/uuid"
)

type Product struct {
	ID            uuid.UUID `json:"id"`
	Name          string    `json:"name"`
	Description   string    `json:"description,omitempty"`
	Price         float64   `json:"price"`
	Category      string    `json:"category,omitempty"`
	ImageURL      string    `json:"image_url,omitempty"`
	Stock         int       `json:"stock"`
	MinStockAlert int       `json:"min_stock_alert"`
	Tags          string    `json:"tags,omitempty"`
	Active        bool      `json:"active"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}
