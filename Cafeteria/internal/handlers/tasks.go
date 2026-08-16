package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/NosedimetuXD/cafeteria/internal/events"
	custommw "github.com/NosedimetuXD/cafeteria/internal/middleware"
	"github.com/NosedimetuXD/cafeteria/internal/models"
)

type TaskHandler struct {
	DB  *pgxpool.Pool
	Hub *events.Hub
}

func NewTaskHandler(db *pgxpool.Pool, hub *events.Hub) *TaskHandler {
	return &TaskHandler{DB: db, Hub: hub}
}

// GET /tasks — cualquier usuario logueado ve todas las tareas
func (h *TaskHandler) List(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(r.Context(),
		`SELECT id, title, description, assigned_to, created_by, status, due_date, created_at, updated_at
		 FROM tasks ORDER BY due_date NULLS LAST, created_at DESC`)
	if err != nil {
		log.Printf("error consultando tareas: %v", err)
		http.Error(w, "error consultando tareas", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var tasks []models.Task
	for rows.Next() {
		var t models.Task
		if err := rows.Scan(&t.ID, &t.Title, &t.Description, &t.AssignedTo, &t.CreatedBy, &t.Status, &t.DueDate, &t.CreatedAt, &t.UpdatedAt); err != nil {
			log.Printf("error leyendo tareas: %v", err)
			http.Error(w, "error leyendo tareas", http.StatusInternalServerError)
			return
		}
		tasks = append(tasks, t)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tasks)
}

// POST /tasks — solo owner y admin
type createTaskRequest struct {
	Title       string     `json:"title"`
	Description string     `json:"description"`
	AssignedTo  *uuid.UUID `json:"assigned_to"`
	DueDate     *string    `json:"due_date"` // formato "2026-08-20"
}

func (h *TaskHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req createTaskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "cuerpo inválido", http.StatusBadRequest)
		return
	}
	if req.Title == "" {
		http.Error(w, "el título es obligatorio", http.StatusBadRequest)
		return
	}

	createdBy := r.Context().Value(custommw.ContextUserID)

	var t models.Task
	err := h.DB.QueryRow(r.Context(),
		`INSERT INTO tasks (title, description, assigned_to, created_by, due_date)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, title, description, assigned_to, created_by, status, due_date, created_at, updated_at`,
		req.Title, req.Description, req.AssignedTo, createdBy, req.DueDate,
	).Scan(&t.ID, &t.Title, &t.Description, &t.AssignedTo, &t.CreatedBy, &t.Status, &t.DueDate, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		log.Printf("error creando tarea: %v", err)
		http.Error(w, "error creando tarea", http.StatusInternalServerError)
		return
	}

	h.Hub.Publish("task created", t)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(t)
}

// PUT /tasks/{id} — editar título/descripción/asignación: solo owner y admin
type updateTaskRequest struct {
	Title       string     `json:"title"`
	Description string     `json:"description"`
	AssignedTo  *uuid.UUID `json:"assigned_to"`
	DueDate     *string    `json:"due_date"`
}

func (h *TaskHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	var req updateTaskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "cuerpo inválido", http.StatusBadRequest)
		return
	}
	if req.Title == "" {
		http.Error(w, "el título es obligatorio", http.StatusBadRequest)
		return
	}

	var t models.Task
	err = h.DB.QueryRow(r.Context(),
		`UPDATE tasks
		 SET title = $1, description = $2, assigned_to = $3, due_date = $4
		 WHERE id = $5
		 RETURNING id, title, description, assigned_to, created_by, status, due_date, created_at, updated_at`,
		req.Title, req.Description, req.AssignedTo, req.DueDate, id,
	).Scan(&t.ID, &t.Title, &t.Description, &t.AssignedTo, &t.CreatedBy, &t.Status, &t.DueDate, &t.CreatedAt, &t.UpdatedAt)

	if errors.Is(err, pgx.ErrNoRows) {
		http.Error(w, "tarea no encontrada", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("error actualizando tarea: %v", err)
		http.Error(w, "error actualizando tarea", http.StatusInternalServerError)
		return
	}

	h.Hub.Publish("task status updated", t)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(t)
}

// PATCH /tasks/{id}/status — cualquier usuario logueado puede cambiar el estado
// (para que el empleado marque su propia tarea como en progreso/completada)
type updateStatusRequest struct {
	Status models.TaskStatus `json:"status"`
}

func (h *TaskHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	var req updateStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "cuerpo inválido", http.StatusBadRequest)
		return
	}

	statusStr := string(req.Status)
	if statusStr == "completed" {
		req.Status = models.TaskDone
	}

	switch req.Status {
	case models.TaskPending, models.TaskInProgress, models.TaskDone:
		// válido
	default:
		http.Error(w, "estado inválido", http.StatusBadRequest)
		return
	}

	var t models.Task
	err = h.DB.QueryRow(r.Context(),
		`UPDATE tasks SET status = $1 WHERE id = $2
		 RETURNING id, title, description, assigned_to, created_by, status, due_date, created_at, updated_at`,
		req.Status, id,
	).Scan(&t.ID, &t.Title, &t.Description, &t.AssignedTo, &t.CreatedBy, &t.Status, &t.DueDate, &t.CreatedAt, &t.UpdatedAt)

	if errors.Is(err, pgx.ErrNoRows) {
		http.Error(w, "tarea no encontrada", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("error actualizando estado: %v", err)
		http.Error(w, "error actualizando estado", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(t)
}

// DELETE /tasks/{id} — solo owner y admin
func (h *TaskHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	tag, err := h.DB.Exec(r.Context(), `DELETE FROM tasks WHERE id = $1`, id)
	if err != nil {
		log.Printf("error borrando tarea: %v", err)
		http.Error(w, "error borrando tarea", http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		http.Error(w, "tarea no encontrada", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
