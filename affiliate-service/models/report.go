package models

import "time"

// AffiliateReport represents a single row from the CSV report
type AffiliateReport struct {
	Date           time.Time `json:"date"`
	ProductTitle   string    `json:"product_title"`
	ASIN           string    `json:"asin"`
	Clicks         int       `json:"clicks"`
	OrderedItems   int       `json:"ordered_items"`
	ShippedItems   int       `json:"shipped_items"`
	ReturnedItems  int       `json:"returned_items"`
	ConversionRate float64   `json:"conversion_rate"`
	Revenue        float64   `json:"revenue"`
	Earnings       float64   `json:"earnings"`
	Tag            string    `json:"tag"`
	Subtag         string    `json:"subtag"` // Creator ID
}

// CreatorStats represents aggregated statistics for a creator
type CreatorStats struct {
	CreatorID      string               `json:"creator_id"`
	TotalEarnings  float64              `json:"total_earnings"`
	TotalClicks    int                  `json:"total_clicks"`
	TotalOrders    int                  `json:"total_orders"`
	TotalShipped   int                  `json:"total_shipped"`
	TotalReturns   int                  `json:"total_returns"`
	ConversionRate float64              `json:"conversion_rate"`
	TopProducts    []ProductPerformance `json:"top_products"`
	LastUpdated    time.Time            `json:"last_updated"`
	DailyEarnings  []DailyEarning       `json:"daily_earnings"`
}

// ProductPerformance represents performance metrics for a single product
type ProductPerformance struct {
	ProductTitle   string  `json:"product_title"`
	ASIN           string  `json:"asin"`
	Clicks         int     `json:"clicks"`
	Orders         int     `json:"orders"`
	Revenue        float64 `json:"revenue"`
	Earnings       float64 `json:"earnings"`
	ConversionRate float64 `json:"conversion_rate"`
}

// DailyEarning represents earnings for a specific date
type DailyEarning struct {
	Date     string  `json:"date"`
	Earnings float64 `json:"earnings"`
	Clicks   int     `json:"clicks"`
	Orders   int     `json:"orders"`
}
