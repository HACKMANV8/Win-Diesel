package service

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/livemint/globals"
	"github.com/livemint/models"
)

// ParseCSVReport reads and parses the affiliate report CSV file
func ParseCSVReport(filepath string) ([]models.AffiliateReport, error) {
	file, err := os.Open(filepath)
	if err != nil {
		return nil, fmt.Errorf("failed to open CSV file: %w", err)
	}
	defer file.Close()

	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("failed to read CSV: %w", err)
	}

	if len(records) < 2 {
		return nil, fmt.Errorf("CSV file is empty or has no data rows")
	}

	var reports []models.AffiliateReport
	for i, record := range records {
		if i == 0 {
			// Skip header row
			continue
		}

		if len(record) < 12 {
			log.Printf("Skipping row %d: insufficient columns", i)
			continue
		}

		date, err := time.Parse("2006-01-02", record[0])
		if err != nil {
			log.Printf("Skipping row %d: invalid date format: %v", i, err)
			continue
		}

		clicks, _ := strconv.Atoi(record[3])
		orderedItems, _ := strconv.Atoi(record[4])
		shippedItems, _ := strconv.Atoi(record[5])
		returnedItems, _ := strconv.Atoi(record[6])

		// Parse conversion rate (remove % sign)
		conversionStr := strings.TrimSuffix(record[7], "%")
		conversionRate, _ := strconv.ParseFloat(conversionStr, 64)

		revenue, _ := strconv.ParseFloat(record[8], 64)
		earnings, _ := strconv.ParseFloat(record[9], 64)

		// Deduct 3% platform commission from earnings
		platformCommission := earnings * 0.03
		creatorEarnings := earnings - platformCommission

		report := models.AffiliateReport{
			Date:           date,
			ProductTitle:   record[1],
			ASIN:           record[2],
			Clicks:         clicks,
			OrderedItems:   orderedItems,
			ShippedItems:   shippedItems,
			ReturnedItems:  returnedItems,
			ConversionRate: conversionRate,
			Revenue:        revenue,
			Earnings:       creatorEarnings, // Creator gets 97% after platform commission
			Tag:            record[10],
			Subtag:         record[11],
		}

		reports = append(reports, report)
	}

	return reports, nil
}

// AggregateByCreator aggregates report data by creator ID (subtag)
func AggregateByCreator(reports []models.AffiliateReport) map[string]models.CreatorStats {
	creatorMap := make(map[string]models.CreatorStats)
	productMap := make(map[string]map[string]*models.ProductPerformance) // creator -> product ASIN -> performance
	dailyMap := make(map[string]map[string]*models.DailyEarning)         // creator -> date -> earnings

	for _, report := range reports {
		creatorID := report.Subtag

		// Initialize maps if needed
		if _, exists := creatorMap[creatorID]; !exists {
			creatorMap[creatorID] = models.CreatorStats{
				CreatorID:   creatorID,
				TopProducts: []models.ProductPerformance{},
			}
			productMap[creatorID] = make(map[string]*models.ProductPerformance)
			dailyMap[creatorID] = make(map[string]*models.DailyEarning)
		}

		stats := creatorMap[creatorID]
		stats.TotalEarnings += report.Earnings
		stats.TotalClicks += report.Clicks
		stats.TotalOrders += report.OrderedItems
		stats.TotalShipped += report.ShippedItems
		stats.TotalReturns += report.ReturnedItems
		stats.LastUpdated = time.Now()
		creatorMap[creatorID] = stats

		// Aggregate product performance
		if _, exists := productMap[creatorID][report.ASIN]; !exists {
			productMap[creatorID][report.ASIN] = &models.ProductPerformance{
				ProductTitle: report.ProductTitle,
				ASIN:         report.ASIN,
			}
		}
		prod := productMap[creatorID][report.ASIN]
		prod.Clicks += report.Clicks
		prod.Orders += report.OrderedItems
		prod.Revenue += report.Revenue
		prod.Earnings += report.Earnings

		// Aggregate daily earnings
		dateStr := report.Date.Format("2006-01-02")
		if _, exists := dailyMap[creatorID][dateStr]; !exists {
			dailyMap[creatorID][dateStr] = &models.DailyEarning{
				Date: dateStr,
			}
		}
		daily := dailyMap[creatorID][dateStr]
		daily.Earnings += report.Earnings
		daily.Clicks += report.Clicks
		daily.Orders += report.OrderedItems
	}

	// Calculate conversion rates and finalize data
	for creatorID, stats := range creatorMap {
		if stats.TotalClicks > 0 {
			stats.ConversionRate = (float64(stats.TotalOrders) / float64(stats.TotalClicks)) * 100
		}

		// Convert product map to sorted slice (top 5 by earnings)
		var products []models.ProductPerformance
		for _, prod := range productMap[creatorID] {
			if prod.Clicks > 0 {
				prod.ConversionRate = (float64(prod.Orders) / float64(prod.Clicks)) * 100
			}
			products = append(products, *prod)
		}

		// Sort by earnings (descending)
		for i := 0; i < len(products); i++ {
			for j := i + 1; j < len(products); j++ {
				if products[j].Earnings > products[i].Earnings {
					products[i], products[j] = products[j], products[i]
				}
			}
		}

		// Keep top 5
		if len(products) > 5 {
			products = products[:5]
		}
		stats.TopProducts = products

		// Convert daily map to slice
		var dailyEarnings []models.DailyEarning
		for _, daily := range dailyMap[creatorID] {
			dailyEarnings = append(dailyEarnings, *daily)
		}
		stats.DailyEarnings = dailyEarnings

		creatorMap[creatorID] = stats
	}

	return creatorMap
}

// StoreCreatorStatsInRedis stores aggregated creator stats in Redis
func StoreCreatorStatsInRedis(stats map[string]models.CreatorStats) error {
	for creatorID, stat := range stats {
		key := fmt.Sprintf("creator:stats:%s", creatorID)

		jsonData, err := json.Marshal(stat)
		if err != nil {
			log.Printf("Error marshaling stats for creator %s: %v", creatorID, err)
			continue
		}

		err = globals.RedisClient.Set(globals.Ctx, key, jsonData, 0).Err()
		if err != nil {
			log.Printf("Error storing stats in Redis for creator %s: %v", creatorID, err)
			continue
		}

		log.Printf("Stored stats for creator %s: $%.2f earnings, %d clicks",
			creatorID, stat.TotalEarnings, stat.TotalClicks)
	}

	return nil
}

// GetCreatorStatsFromRedis retrieves creator stats from Redis
func GetCreatorStatsFromRedis(creatorID string) (*models.CreatorStats, error) {
	key := fmt.Sprintf("creator:stats:%s", creatorID)

	jsonData, err := globals.RedisClient.Get(globals.Ctx, key).Result()
	if err != nil {
		return nil, fmt.Errorf("creator stats not found: %w", err)
	}

	var stats models.CreatorStats
	err = json.Unmarshal([]byte(jsonData), &stats)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal stats: %w", err)
	}

	return &stats, nil
}

// ProcessCSVReport is the main function to process the CSV and update Redis
func ProcessCSVReport(filepath string) error {
	log.Println("Starting CSV report processing...")

	// Parse CSV
	reports, err := ParseCSVReport(filepath)
	if err != nil {
		return fmt.Errorf("failed to parse CSV: %w", err)
	}
	log.Printf("Parsed %d records from CSV", len(reports))

	// Aggregate by creator
	creatorStats := AggregateByCreator(reports)
	log.Printf("Aggregated stats for %d creators", len(creatorStats))

	// Store in Redis
	err = StoreCreatorStatsInRedis(creatorStats)
	if err != nil {
		return fmt.Errorf("failed to store stats in Redis: %w", err)
	}

	log.Println("CSV report processing completed successfully")
	return nil
}
