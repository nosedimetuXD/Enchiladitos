package events

import (
	"encoding/json"
	"sync"
)

type Event struct {
	Type string      `json:"type"` // "sale_created", "inventory_updated", "task_created", etc.
	Data interface{} `json:"data"`
}

type Hub struct {
	mu      sync.Mutex
	clients map[chan Event]bool
}

func NewHub() *Hub {
	return &Hub{
		clients: make(map[chan Event]bool),
	}
}

func (h *Hub) Subscribe() chan Event {
	ch := make(chan Event, 10) // buffer para no bloquear si un cliente va lento
	h.mu.Lock()
	h.clients[ch] = true
	h.mu.Unlock()
	return ch
}

func (h *Hub) Unsubscribe(ch chan Event) {
	h.mu.Lock()
	delete(h.clients, ch)
	close(ch)
	h.mu.Unlock()
}

func (h *Hub) Publish(eventType string, data interface{}) {
	h.mu.Lock()
	defer h.mu.Unlock()

	event := Event{Type: eventType, Data: data}
	for ch := range h.clients {
		select {
		case ch <- event:
		default:
			// el cliente está lento y su buffer está lleno; se salta este evento
			// para no bloquear a los demás clientes
		}
	}
}

func (e Event) ToSSE() []byte {
	payload, _ := json.Marshal(e.Data)
	return []byte("event: " + e.Type + "\ndata: " + string(payload) + "\n\n")
}
