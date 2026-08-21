package main

import (
	"log"
	"net/http"
	"os"
	"time"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8084"
	}

	// Simple ticker for demonstration (replaces robfig/cron for simplicity)
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	go func() {
		for {
			select {
			case t := <-ticker.C:
				log.Printf("[SCHEDULER] Running PTP sweep at %v", t)
				// Here we would sweep the database for due PTPs
				// and trigger agent-svc if they are broken
			}
		}
	}()

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status": "ok", "service": "scheduler-svc"}`))
	})

	log.Printf("Scheduler Service listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
