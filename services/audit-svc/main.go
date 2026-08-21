package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"
)

type AuditLog struct {
	EventID   string                 `json:"event_id"`
	Module    string                 `json:"module"`
	Action    string                 `json:"action"`
	Decision  string                 `json:"decision"`
	Metadata  map[string]interface{} `json:"metadata"`
	Timestamp string                 `json:"timestamp"`
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8083"
	}

	http.HandleFunc("/append", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var logEntry AuditLog
		if err := json.NewDecoder(r.Body).Decode(&logEntry); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		if logEntry.Timestamp == "" {
			logEntry.Timestamp = time.Now().UTC().Format(time.RFC3339)
		}

		// In a real app, this would append to a PostgreSQL table
		// e.g. INSERT INTO audit_logs ...
		log.Printf("[AUDIT] %s | %s | %s", logEntry.Timestamp, logEntry.Module, logEntry.Action)

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		w.Write([]byte(`{"status": "recorded"}`))
	})

	log.Printf("Audit Service listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
