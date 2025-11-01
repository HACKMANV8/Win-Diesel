package models

import (
	"time"

	"gorm.io/gorm"
)

// User represents a creator/affiliate user in the system
type User struct {
	ID           uint           `gorm:"primarykey" json:"id"`
	Username     string         `gorm:"uniqueIndex;not null" json:"username"`
	PasswordHash string         `gorm:"not null" json:"-"`
	CreatorID    string         `gorm:"uniqueIndex;not null" json:"creator_id"`
	UPIID        string         `gorm:"not null" json:"upi_id"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}
