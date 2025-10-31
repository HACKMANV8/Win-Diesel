package handler

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"regexp"
	"sort"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

// MarkdownRequest accepts raw markdown content and a list of products (ProductResponse)
// The handler will return markdown with occurrences of product names linked to their custom links.
type MarkdownRequest struct {
	Content  string            `json:"content"`
	Products []ProductResponse `json:"products"`
	// If set and GEMINI_API_KEY is available, the service will attempt to call Gemini to perform the replacement.
	UseGemini bool `json:"use_gemini,omitempty"`
}

type MarkdownResponse struct {
	Content string `json:"content"`
}

// AffiliateMarkdown handles POST /api/markdown/affiliate
func AffiliateMarkdown(c *gin.Context) {
	var req MarkdownRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	// If user requested Gemini and API key is present, we could call the external model.
	// For now, fall back to the local replacement function if API key is absent or if the external call fails.
	if req.UseGemini {
		if apiKey := os.Getenv("GEMINI_API_KEY"); apiKey != "" {
			linked, err := callGeminiStub(req.Content, req.Products)
			if err == nil {
				c.JSON(http.StatusOK, MarkdownResponse{Content: linked})
				return
			}
			log.Printf("Gemini call failed, falling back to local replacement: %v", err)
		}
	}

	result := localLinkifyMarkdown(req.Content, req.Products)
	c.JSON(http.StatusOK, MarkdownResponse{Content: result})
}

// callGeminiStub is a placeholder that simulates an external model call. Replace with real API call if desired.
func callGeminiStub(content string, products []ProductResponse) (string, error) {
	ctx := context.Background()
	apiKey := os.Getenv("GEMINI_API_KEY")

	if apiKey == "" {
		return "", fmt.Errorf("GEMINI_API_KEY not set")
	}

	// Initialize Gemini client
	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return "", fmt.Errorf("failed to create Gemini client: %w", err)
	}
	defer client.Close()

	// Use Gemini 2.5 Flash (free tier)
	model := client.GenerativeModel("gemini-2.5-flash")

	// Build the product list for the prompt
	var productList strings.Builder
	for _, p := range products {
		productList.WriteString(fmt.Sprintf("- Product: \"%s\" -> Link: %s\n", p.ProductName, p.CustomLink))
	}

	// Create a structured prompt for Gemini
	prompt := fmt.Sprintf(`You are a markdown link injection assistant. Your task is to find product names in the markdown content and replace them with markdown hyperlinks.

Product mappings (case-insensitive):
%s

Original markdown content:
%s

Instructions:
1. Find all occurrences of the product names in the content (case-insensitive)
2. Replace each occurrence with a markdown link: [ProductName](CustomLink)
3. Preserve the original casing of the product name in the link text
4. Do NOT modify any other part of the markdown
5. If a product name is already inside a link, do not double-link it
6. Return ONLY the modified markdown content, no explanations

Modified markdown:`, productList.String(), content)

	// Generate content
	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return "", fmt.Errorf("Gemini API call failed: %w", err)
	}

	// Extract the response text
	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("empty response from Gemini")
	}

	// Get the text from the first part
	var result strings.Builder
	for _, part := range resp.Candidates[0].Content.Parts {
		if txt, ok := part.(genai.Text); ok {
			result.WriteString(string(txt))
		}
	}

	return strings.TrimSpace(result.String()), nil
}

// localLinkifyMarkdown finds occurrences of product names in the markdown and replaces them with markdown links
// to the product's CustomLink. Replacement is case-insensitive and attempts to avoid replacing text that
// is already inside a markdown link label (i.e. inside `[...]`).
func localLinkifyMarkdown(content string, products []ProductResponse) string {
	// Sort products by name length (desc) so longer names match before shorter ones and avoid partial matches.
	sort.SliceStable(products, func(i, j int) bool {
		return len(products[i].ProductName) > len(products[j].ProductName)
	})

	out := content

	for _, p := range products {
		name := p.ProductName
		link := p.CustomLink
		if name == "" || link == "" {
			continue
		}

		// Build a case-insensitive regex for the product name
		re := regexp.MustCompile(`(?i)` + regexp.QuoteMeta(name))

		// Find all matches and rebuild the string to avoid overlapping replacements and to inspect context
		matches := re.FindAllStringIndex(out, -1)
		if len(matches) == 0 {
			continue
		}

		var buf bytes.Buffer
		lastIndex := 0
		for _, m := range matches {
			start, end := m[0], m[1]

			// If match is inside an existing link label (immediately preceded by '['), skip replacement
			if start > 0 && out[start-1] == '[' {
				continue
			}

			// Write previous chunk and replacement
			buf.WriteString(out[lastIndex:start])
			matchedText := out[start:end]
			// Write markdown link preserving matched text casing
			buf.WriteString("[")
			buf.WriteString(matchedText)
			buf.WriteString("](")
			buf.WriteString(link)
			buf.WriteString(")")

			lastIndex = end
		}

		if lastIndex > 0 {
			// append remainder
			buf.WriteString(out[lastIndex:])
			out = buf.String()
		}
	}

	return out
}
