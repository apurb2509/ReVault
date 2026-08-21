package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true }, // Allow all origins for dev
}

type Hub struct {
	clients    map[*websocket.Conn]bool
	broadcast  chan []byte
	register   chan *websocket.Conn
	unregister chan *websocket.Conn
}

func newHub() *Hub {
	return &Hub{
		broadcast:  make(chan []byte),
		register:   make(chan *websocket.Conn),
		unregister: make(chan *websocket.Conn),
		clients:    make(map[*websocket.Conn]bool),
	}
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				client.Close()
			}
		case message := <-h.broadcast:
			for client := range h.clients {
				err := client.WriteMessage(websocket.TextMessage, message)
				if err != nil {
					client.Close()
					delete(h.clients, client)
				}
			}
		}
	}
}

func serveWs(hub *Hub, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Upgrade error:", err)
		return
	}
	hub.register <- conn

	// Keep connection alive and handle incoming (mostly empty for now, we just push)
	go func() {
		defer func() {
			hub.unregister <- conn
		}()
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				break
			}
		}
	}()
}

func handleWebhook(hub *Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// In a real app, verify HMAC here using r.Header.Get("X-Razorpay-Signature")
		var payload map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		
		log.Printf("Received webhook: %v", payload["event"])
		
		// Forward to Python backend (simulating Kafka for local dev)
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
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	hub := newHub()
	go hub.run()

	r := mux.NewRouter()

	// WebSocket endpoint
	r.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		serveWs(hub, w, r)
	})

	// Internal endpoint for Python backend to broadcast events to the frontend
	r.HandleFunc("/internal/broadcast", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		
		var payload map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		msg, err := json.Marshal(payload)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		hub.broadcast <- msg
		log.Printf("Broadcasted event to frontend: %v", payload["event"])
		w.WriteHeader(http.StatusOK)
	}).Methods("POST")

	// Webhook endpoint
	r.HandleFunc("/webhooks/razorpay", handleWebhook(hub)).Methods("POST")

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
