# Gemini Integration Guide

## Setup

1. **Get your Gemini API Key** from [Google AI Studio](https://makersuite.google.com/app/apikey)

2. **Set the environment variable**:
   ```bash
   export GEMINI_API_KEY="your-api-key-here"
   ```

3. **Start the service**:
   ```bash
   go run main.go
   ```

## Usage

### With Gemini (AI-powered replacement)

**Endpoint:** `POST http://localhost:8080/api/markdown/affiliate`

**Request Body:**
```json
{
  "content": "Check out the iPhone 15 Pro which is amazing! The MacBook Pro M3 is also great for developers.",
  "use_gemini": true,
  "products": [
    {
      "product_name": "iPhone 15 Pro",
      "custom_link": "http://localhost:8080/CUST001/iphone-15-pro"
    },
    {
      "product_name": "MacBook Pro M3",
      "custom_link": "http://localhost:8080/CUST001/macbook-pro-m3"
    }
  ]
}
```

### Without Gemini (Local replacement)

Set `"use_gemini": false` or omit it to use the local regex-based replacement:

```json
{
  "content": "Check out the iPhone 15 Pro which is amazing!",
  "products": [
    {
      "product_name": "iPhone 15 Pro",
      "custom_link": "http://localhost:8080/CUST001/iphone-15-pro"
    }
  ]
}
```

## Response

Both methods return the same format:

```json
{
  "content": "Check out the [iPhone 15 Pro](http://localhost:8080/CUST001/iphone-15-pro) which is amazing! The [MacBook Pro M3](http://localhost:8080/CUST001/macbook-pro-m3) is also great for developers."
}
```

## Features

- **AI-Powered**: Uses Gemini 1.5 Flash (free tier) for intelligent product name detection
- **Fallback**: Automatically falls back to local replacement if Gemini fails or API key is missing
- **Case-Insensitive**: Finds product names regardless of casing
- **Smart Linking**: Preserves original casing in link text
- **No Double-Linking**: Skips products already in links

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Optional | Google Gemini API key (required only if `use_gemini: true`) |

## Notes

- Gemini 1.5 Flash is part of the free tier with generous quotas
- Local replacement uses regex and is instant (no API calls)
- If `GEMINI_API_KEY` is not set and `use_gemini: true`, it falls back to local replacement
