package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
)

type PaymentLinkRequest struct {
	Amount      int64  `json:"amount"` // in paise
	Currency    string `json:"currency"`
	Description string `json:"description"`
	Customer    struct {
		Name    string `json:"name"`
		Contact string `json:"contact"`
		Email   string `json:"email"`
	} `json:"customer"`
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}

	http.HandleFunc("/create", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req PaymentLinkRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// In a real app, this would use Razorpay's API:
		// POST https://api.razorpay.com/v1/payment_links
		log.Printf("Creating payment link for ₹%.2f for %s", float64(req.Amount)/100, req.Customer.Name)

		// Simulated response
		linkID := fmt.Sprintf("plink_%d", os.Getpid())
		shortURL := fmt.Sprintf("https://rzp.io/i/%s", linkID)

		response := map[string]interface{}{
			"id":         linkID,
			"short_url":  shortURL,
			"status":     "created",
			"amount":     req.Amount,
			"created_at": "now",
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	})

	log.Printf("Payment Link Service listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
