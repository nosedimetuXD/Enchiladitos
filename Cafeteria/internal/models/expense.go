package models

import (
	"time"

	"github.com/google/uuid"
)

type Expense struct {
	ID             uuid.UUID  `json:"id"`
	Description    string     `json:"description"`
	Amount         float64    `json:"amount"`
	Category       string     `json:"category"`
	PaymentMethod  string     `json:"payment_method"`
	RegisteredBy   uuid.UUID  `json:"registered_by"`
	RegistererName string     `json:"registerer_name,omitempty"`
	IngredientID   *uuid.UUID `json:"ingredient_id,omitempty"`
	IngredientName string     `json:"ingredient_name,omitempty"`
	QuantityAdded  float64    `json:"quantity_added,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
}

type AccountingSummary struct {
	TotalIncome          float64            `json:"total_income"`
	TotalExpenses        float64            `json:"total_expenses"`
	NetBalance           float64            `json:"net_balance"`
	IncomeByPaymentMethod map[string]float64 `json:"income_by_payment_method"`
	ExpensesByCategory   map[string]float64 `json:"expenses_by_category"`
	SalesCount           int                `json:"sales_count"`
	ExpensesCount        int                `json:"expenses_count"`
}
