package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/livemint/service"
)

// GetCreatorDashboard returns dashboard statistics for a specific creator
func GetCreatorDashboard(c *gin.Context) {
	creatorID := c.Param("creatorId")

	if creatorID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "creator_id is required"})
		return
	}

	stats, err := service.GetCreatorStatsFromRedis(creatorID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Creator stats not found", "creator_id": creatorID})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// ProcessReport manually triggers CSV report processing
func ProcessReport(c *gin.Context) {
	var req struct {
		FilePath string `json:"file_path"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		// Use default path if not provided
		req.FilePath = "sample_affiliate_report.csv"
	}

	err := service.ProcessCSVReport(req.FilePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process report", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Report processed successfully", "file_path": req.FilePath})
}

// RefreshDashboard processes the CSV report and returns updated stats for a creator
func RefreshDashboard(c *gin.Context) {
	creatorID := c.Param("creatorId")

	if creatorID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "creator_id is required"})
		return
	}

	// Process the CSV report
	err := service.ProcessCSVReport("sample_affiliate_report.csv")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process report", "details": err.Error()})
		return
	}

	// Get updated stats
	stats, err := service.GetCreatorStatsFromRedis(creatorID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Creator stats not found after refresh", "creator_id": creatorID})
		return
	}

	c.JSON(http.StatusOK, stats)
}
