package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
)

type NotificationRequest struct {
	Channel   string `json:"channel"`   // "whatsapp", "email", "sms"
	Recipient string `json:"recipient"` // phone number or email address
	Template  string `json:"template"`  // e.g. "tier1_recovery", "b2b_escalation"
	Variables map[string]string `json:"variables"`
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	http.HandleFunc("/send", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req NotificationRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// In a real app, this would call Meta WhatsApp API or SendGrid API
		// We'll simulate success and log it
		log.Printf("Sending %s to %s using template %s", req.Channel, req.Recipient, req.Template)

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status": "success", "message": "Notification dispatched"}`))
	})

	log.Printf("Notification Service listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
