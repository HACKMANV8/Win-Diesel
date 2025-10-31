package redis_service

import (
	"log"

	"github.com/livemint/globals"
	"github.com/redis/go-redis/v9"

)

func InitRedis() {
	globals.RedisClient = redis.NewClient(&redis.Options{
		Addr:     "localhost:6379",
		Password: "", // no password set
		DB:       0,  // use default DB
	})

	// Test the connection
	_, err := globals.RedisClient.Ping(globals.Ctx).Result()
	if err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	log.Println("Successfully connected to Redis")
}