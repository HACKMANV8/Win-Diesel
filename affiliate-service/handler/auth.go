package handler

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/livemint/database"
	"github.com/livemint/models"
	"golang.org/x/crypto/bcrypt"
)

type SignupRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required,min=6"`
	UPIID    string `json:"upi_id" binding:"required"`
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type AuthResponse struct {
	ID        uint   `json:"id"`
	Username  string `json:"username"`
	CreatorID string `json:"creator_id"`
	UPIID     string `json:"upi_id"`
}

// generateCreatorID generates a unique creator ID in the format creator_XXXXXX
func generateCreatorID() string {
	bytes := make([]byte, 6)
	rand.Read(bytes)
	return fmt.Sprintf("creator_%s", hex.EncodeToString(bytes))
}

// Signup creates a new user account
func Signup(c *gin.Context) {
	var req SignupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if username already exists
	var existingUser models.User
	if err := database.DB.Where("username = ?", req.Username).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Username already exists"})
		return
	}

	// Generate unique creator_id
	var creatorID string
	for {
		creatorID = generateCreatorID()
		// Check if creator_id already exists (rare collision case)
		if err := database.DB.Where("creator_id = ?", creatorID).First(&existingUser).Error; err != nil {
			// creator_id is unique
			break
		}
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Create user
	user := models.User{
		Username:     req.Username,
		PasswordHash: string(hashedPassword),
		CreatorID:    creatorID,
		UPIID:        req.UPIID,
	}

	if err := database.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	response := AuthResponse{
		ID:        user.ID,
		Username:  user.Username,
		CreatorID: user.CreatorID,
		UPIID:     user.UPIID,
	}

	c.JSON(http.StatusCreated, response)
}

// Login authenticates a user
func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find user
	var user models.User
	if err := database.DB.Where("username = ?", req.Username).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
		return
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
		return
	}

	response := AuthResponse{
		ID:        user.ID,
		Username:  user.Username,
		CreatorID: user.CreatorID,
		UPIID:     user.UPIID,
	}

	c.JSON(http.StatusOK, response)
}

// GetUserByCreatorID retrieves user info by creator ID
func GetUserByCreatorID(c *gin.Context) {
	creatorID := c.Param("creatorId")

	var user models.User
	if err := database.DB.Where("creator_id = ?", creatorID).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": fmt.Sprintf("User with creator_id %s not found", creatorID)})
		return
	}

	response := AuthResponse{
		ID:        user.ID,
		Username:  user.Username,
		CreatorID: user.CreatorID,
		UPIID:     user.UPIID,
	}

	c.JSON(http.StatusOK, response)
}
