package handler

import (
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/livemint/globals"
	"github.com/redis/go-redis/v9"
)
type ProductListRequest struct {
	CustomerID   string           `json:"customer_id"`
	CustomerName string           `json:"customer_name"`
	ProductList  []ProductRequest `json:"product_list"`
}

type ProductRequest struct {
	ProductName   string `json:"product_name"`
	AffiliateLink string `json:"affiliate_link"`
}

type ProductListResponse struct {
	CustomerID   string            `json:"customer_id"`
	CustomerName string            `json:"customer_name"`
	Products     []ProductResponse `json:"products"`
}

type ProductResponse struct {
	ProductName string `json:"product_name"`
	CustomLink  string `json:"custom_link"`
}

func CreateAffiliateLinks(c *gin.Context) {
	var req ProductListRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	if req.CustomerID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "customer_id is required"})
		return
	}

	var products []ProductResponse

	for _, product := range req.ProductList {
		if product.ProductName == "" || product.AffiliateLink == "" {
			continue
		}

		// Normalize product name for URL (replace spaces with hyphens, lowercase)
		normalizedProductName := normalizeProductName(product.ProductName)

		// Create Redis key: customerId:productName
		redisKey := fmt.Sprintf("%s:%s", req.CustomerID, normalizedProductName)

		// Store affiliate link in Redis
		err := globals.RedisClient.Set(globals.Ctx, redisKey, product.AffiliateLink, 0).Err()
		if err != nil {
			log.Printf("Error storing in Redis: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store affiliate link"})
			return
		}

		// Generate custom link
		customLink := fmt.Sprintf("%s/%s/%s", globals.BaseURL, req.CustomerID, normalizedProductName)

		products = append(products, ProductResponse{
			ProductName: product.ProductName,
			CustomLink:  customLink,
		})
	}

	response := ProductListResponse{
		CustomerID:   req.CustomerID,
		CustomerName: req.CustomerName,
		Products:     products,
	}

	c.JSON(http.StatusOK, response)
}

func RedirectToAffiliate(c *gin.Context) {
	customerId := c.Param("customerId")
	productName := c.Param("productName")

	// Create Redis key
	redisKey := fmt.Sprintf("%s:%s", customerId, productName)

	// Get affiliate link from Redis
	affiliateLink, err := globals.RedisClient.Get(globals.Ctx, redisKey).Result()
	if err == redis.Nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Affiliate link not found"})
		return
	} else if err != nil {
		log.Printf("Error retrieving from Redis: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve affiliate link"})
		return
	}

	// Redirect to the affiliate link
	c.Redirect(http.StatusMovedPermanently, affiliateLink)
}

func normalizeProductName(productName string) string {
	// Convert to lowercase
	normalized := strings.ToLower(productName)
	// Replace spaces with hyphens
	normalized = strings.ReplaceAll(normalized, " ", "-")
	// URL encode to handle special characters
	normalized = url.PathEscape(normalized)
	return normalized
}