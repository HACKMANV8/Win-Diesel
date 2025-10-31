package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"github.com/livemint/globals"
	"github.com/livemint/handler"
	redis_service "github.com/livemint/redis"
)


func main() {
	redis_service.InitRedis()
	redisClient := globals.RedisClient
	defer redisClient.Close()

	router := gin.Default()

	// POST endpoint to create custom affiliate links
	router.POST("/api/custom-affiliate/create", handler.CreateAffiliateLinks)

	// POST endpoint to process markdown and inject affiliate links
	router.POST("/api/markdown/affiliate", handler.AffiliateMarkdown)

	// GET endpoint to handle redirects
	router.GET("/:customerId/:productName", handler.RedirectToAffiliate)

	log.Println("Server starting on :8080")
	router.Run(":8080")
}
