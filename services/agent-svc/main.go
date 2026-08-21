package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

type Event struct {
	Type    string                 `json:"type"`
	Payload map[string]interface{} `json:"payload"`
}

type ClassificationResult struct {
	RootCause     string  `json:"root_cause"`
	Confidence    float64 `json:"confidence"`
	Action        string  `json:"action"`
	EscalateToHuman bool  `json:"escalate_to_human"`
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8085"
	}

	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		log.Println("WARNING: GEMINI_API_KEY is not set. AI classification will fail.")
	}

	http.HandleFunc("/process", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var event Event
		if err := json.NewDecoder(r.Body).Decode(&event); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		log.Printf("Processing event type: %s", event.Type)

		// Call Gemini for classification
		result, err := classifyWithGemini(r.Context(), apiKey, event)
		if err != nil {
			log.Printf("Gemini classification failed: %v", err)
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(result)
	})

	log.Printf("Agent Service listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

func classifyWithGemini(ctx context.Context, apiKey string, event Event) (*ClassificationResult, error) {
	if apiKey == "" {
		// Mock response for testing if no API key is provided
		return &ClassificationResult{
			RootCause:     "INSUFFICIENT_FUNDS",
			Confidence:    0.95,
			Action:        "SEND_WHATSAPP_LINK",
			EscalateToHuman: false,
		}, nil
	}

	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return nil, err
	}
	defer client.Close()

	model := client.GenerativeModel("gemini-1.5-flash")
	model.ResponseMIMEType = "application/json"
	model.SystemInstruction = &genai.Content{
		Parts: []genai.Part{
			genai.Text("You are an autonomous revenue recovery agent. Analyze the payment failure event and classify the root cause. Return JSON with keys: root_cause, confidence, action, escalate_to_human."),
		},
	}

	eventJSON, _ := json.Marshal(event)
	prompt := fmt.Sprintf("Analyze this event: %s", string(eventJSON))

	// Timeout context
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return nil, err
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("empty response from Gemini")
	}

	part := resp.Candidates[0].Content.Parts[0]
	textPart, ok := part.(genai.Text)
	if !ok {
		return nil, fmt.Errorf("unexpected response type")
	}

	var result ClassificationResult
	if err := json.Unmarshal([]byte(textPart), &result); err != nil {
		return nil, err
	}

	return &result, nil
}
