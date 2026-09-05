package models

import (
	"time"

	"github.com/google/uuid"
)

type CustomerStampsInfo struct {
	TotalPaidEligible  float64 `json:"total_paid_eligible"`
	TotalStampsEarned  int     `json:"total_stamps_earned"`
	TotalRewardsEarned int     `json:"total_rewards_earned"`
	RewardsRedeemed    int     `json:"rewards_redeemed"`
	AvailableRewards   int     `json:"available_rewards"`
	HasRewardUnlocked  bool    `json:"has_reward_unlocked"`
	CurrentCycleStamps int     `json:"current_cycle_stamps"`
	ProgressPercent    float64 `json:"progress_percent"`
	AmountToNextStamp  float64 `json:"amount_to_next_stamp"`
	AmountToNextReward float64 `json:"amount_to_next_reward"`
}

type Customer struct {
	ID         uuid.UUID           `json:"id"`
	FirstName  string              `json:"first_name"`
	LastName   string              `json:"last_name"`
	Phone      string              `json:"phone"`
	Email      string              `json:"email"`
	Notes      string              `json:"notes"`
	TotalDebt  float64             `json:"total_debt,omitempty"`
	StampsInfo *CustomerStampsInfo `json:"stamps_info,omitempty"`
	CreatedAt  time.Time           `json:"created_at"`
	UpdatedAt  time.Time           `json:"updated_at"`
}

type CustomerPayment struct {
	ID             uuid.UUID  `json:"id"`
	CustomerID     uuid.UUID  `json:"customer_id"`
	Amount         float64    `json:"amount"`
	PaymentMethod  string     `json:"payment_method"`
	BankDetails    string     `json:"bank_details,omitempty"`
	Notes          string     `json:"notes,omitempty"`
	RegisteredBy   *uuid.UUID `json:"registered_by,omitempty"`
	RegisteredName string     `json:"registered_name,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
}

type CustomerAccountSummary struct {
	Customer       Customer           `json:"customer"`
	TotalSales     float64            `json:"total_sales"`
	TotalPaid      float64            `json:"total_paid"`
	CurrentDebt    float64            `json:"current_debt"`
	StampsInfo     CustomerStampsInfo `json:"stamps_info"`
	PendingSales   []Sale             `json:"pending_sales"`
	PaymentHistory []CustomerPayment  `json:"payment_history"`
}
