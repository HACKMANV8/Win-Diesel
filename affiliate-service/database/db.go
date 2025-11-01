package database

import (
	"fmt"
	"log"

	"github.com/livemint/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

// InitDB initializes the database connection
func InitDB() error {
	// PostgreSQL connection string
	dsn := "host=localhost user=rishichirchi password=postgres dbname=linkmint port=5432 sslmode=disable TimeZone=Asia/Kolkata"

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	// Auto migrate the schema
	err = DB.AutoMigrate(&models.User{})
	if err != nil {
		return fmt.Errorf("failed to migrate database: %w", err)
	}

	log.Println("Database initialized successfully")
	return nil
}
