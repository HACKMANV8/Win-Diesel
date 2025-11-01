package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"github.com/livemint/database"
	"github.com/livemint/globals"
	"github.com/livemint/handler"
	redis_service "github.com/livemint/redis"
)

func main() {
	// Initialize Redis
	redis_service.InitRedis()
	redisClient := globals.RedisClient
	defer redisClient.Close()

	// Initialize Database
	if err := database.InitDB(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	router := gin.Default()

	// Enable CORS for frontend
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// Authentication endpoints
	router.POST("/api/auth/signup", handler.Signup)
	router.POST("/api/auth/login", handler.Login)
	router.GET("/api/auth/user/:creatorId", handler.GetUserByCreatorID)

	// POST endpoint to create custom affiliate links
	router.POST("/api/custom-affiliate/create", handler.CreateAffiliateLinks)

	// POST endpoint to process markdown and inject affiliate links
	router.POST("/api/markdown/affiliate", handler.AffiliateMarkdown)

	// Dashboard API endpoints
	router.GET("/api/dashboard/:creatorId", handler.GetCreatorDashboard)
	router.POST("/api/dashboard/:creatorId/refresh", handler.RefreshDashboard)
	router.POST("/api/process-report", handler.ProcessReport)

	// GET endpoint to handle redirects
	router.GET("/:customerId/:productName", handler.RedirectToAffiliate)

	log.Println("Server starting on :8080")
	router.Run(":8080")
}
