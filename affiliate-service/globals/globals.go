package globals

import (
	"context"

	"github.com/redis/go-redis/v9"
)

var (
	Ctx         = context.Background()
	RedisClient *redis.Client
	BaseURL     = "http://localhost:8080" // Change this to your domain in production
)
