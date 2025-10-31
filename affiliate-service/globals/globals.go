package globals

import (
	"context"

	"github.com/redis/go-redis/v9"
)

var (
	Ctx         = context.Background()
	RedisClient *redis.Client
	BaseURL     = "https://1afe71742170.ngrok-free.app" // Change this to your domain in production
)
