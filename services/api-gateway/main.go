package main

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"
)

func handleWebhook(w http.ResponseWriter, r *http.Request) {
	// In a real app, verify HMAC here using r.Header.Get("X-Razorpay-Signature")
	var payload map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	
	log.Printf("Received webhook: %v", payload["event"])
	
	// Forward to Python backend (simulating Kafka for local dev)
	// Alternatively, the python backend directly handles this.
	// We'll keep this as a simple ingestion layer.
	pythonURL := "http://localhost:8000/webhooks/razorpay"
	
	// Re-encode payload to send to Python
	payloadBytes, _ := json.Marshal(payload)
	resp, err := http.Post(pythonURL, "application/json", bytes.NewBuffer(payloadBytes))
	if err != nil {
		log.Printf("Failed to forward webhook to Python backend: %v", err)
		// Still return 200 to Razorpay so they don't retry unnecessarily if our backend is down
		w.WriteHeader(http.StatusOK)
		return
	}
	defer resp.Body.Close()
	
	log.Printf("Forwarded webhook to Python backend, status: %s", resp.Status)
	w.WriteHeader(http.StatusOK)
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	r := mux.NewRouter()

	// Webhook endpoint
	r.HandleFunc("/webhooks/razorpay", handleWebhook).Methods("POST")

	// Health check
	r.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status": "ok", "service": "api-gateway"}`))
	}).Methods("GET")

	// CORS wrapper
	corsHandler := func(h http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Razorpay-Signature")
			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}
			h.ServeHTTP(w, r)
		})
	}

	log.Printf("API Gateway listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, corsHandler(r)))
}
