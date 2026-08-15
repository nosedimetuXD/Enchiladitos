package models

import (
	"time"

	"github.com/google/uuid"
)

type ComandaStatus string

const (
	ComandaStatusPending    ComandaStatus = "pendiente"
	ComandaStatusPreparing  ComandaStatus = "en_preparacion"
	ComandaStatusReady      ComandaStatus = "listo"
	ComandaStatusDelivered  ComandaStatus = "entregado"
	ComandaStatusCanceled   ComandaStatus = "cancelado"
)

type ComandaItem struct {
	ProductID   uuid.UUID `json:"product_id"`
	ProductName string    `json:"product_name"`
	Quantity    int       `json:"quantity"`
	Notes       string    `json:"notes,omitempty"`
}

type Comanda struct {
	ID           uuid.UUID     `json:"id"`
	OrderNumber  int           `json:"order_number"`
	SaleID       uuid.UUID     `json:"sale_id"`
	CustomerName string        `json:"customer_name"`
	Status       ComandaStatus `json:"status"`
	Notes        string        `json:"notes,omitempty"`
	CreatedAt    time.Time     `json:"created_at"`
	UpdatedAt    time.Time     `json:"updated_at"`
	Items        []ComandaItem `json:"items,omitempty"`
}
