package main

import (
	"context"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/joho/godotenv"

	"github.com/NosedimetuXD/cafeteria/internal/db"
	"github.com/NosedimetuXD/cafeteria/internal/handlers"
	"github.com/NosedimetuXD/cafeteria/internal/models"

	"github.com/NosedimetuXD/cafeteria/internal/events"
	custommw "github.com/NosedimetuXD/cafeteria/internal/middleware"
)

func main() {

	if err := godotenv.Load(); err != nil {
		log.Println("no se encontró .env, usando variables de entorno del sistema")
	}

	ctx := context.Background()

	pool, err := db.Connect(ctx)
	if err != nil {
		log.Fatalf("no se pudo conectar a la base de datos: %v", err)
	}
	defer pool.Close()

	hub := events.NewHub()

	r := chi.NewRouter()
	r.Use(middleware.Logger)

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("ok"))
	})

	authHandler := handlers.NewAuthHandler(pool)
	r.Post("/login", authHandler.Login)

	productHandler := handlers.NewProductHandler(pool)
	ingredientHandler := handlers.NewIngredientHandler(pool, hub)
	saleHandler := handlers.NewSaleHandler(pool, hub)
	taskHandler := handlers.NewTaskHandler(pool, hub)
	recipeHandler := handlers.NewRecipeHandler(pool)
	eventHandler := handlers.NewEventHandler(hub)

	r.Group(func(r chi.Router) {
		r.Use(custommw.RequireAuthSSE) // en vez de RequireAuth
		r.Get("/events", eventHandler.Stream)
	})

	// Lectura: cualquier usuario logueado, sin importar el rol
	r.Group(func(r chi.Router) {
		r.Use(custommw.RequireAuth)
		r.Get("/products", productHandler.List)
		r.Get("/products/{id}", productHandler.Get)
		r.Get("/ingredients", ingredientHandler.List)
		r.Get("/ingredients/{id}", ingredientHandler.Get)
		r.Get("/products/{id}/recipe", recipeHandler.Get)
	})

	// Crear/editar/borrar productos: solo el dueño
	r.Group(func(r chi.Router) {
		r.Use(custommw.RequireAuth)
		r.Use(custommw.RequireRole(models.RoleOwner))
		r.Post("/products", productHandler.Create)
		r.Put("/products/{id}", productHandler.Update)
		r.Delete("/products/{id}", productHandler.Delete)

		userHandler := handlers.NewUserHandler(pool)
		r.Post("/users", userHandler.Create)

		r.Put("/products/{id}/recipe", recipeHandler.Set)
	})

	// Modificar inventario: dueño, admin y empleado
	r.Group(func(r chi.Router) {
		r.Use(custommw.RequireAuth)
		r.Use(custommw.RequireRole(models.RoleOwner, models.RoleAdmin, models.RoleEmployee))
		r.Post("/ingredients", ingredientHandler.Create)
		r.Put("/ingredients/{id}", ingredientHandler.Update)
		r.Delete("/ingredients/{id}", ingredientHandler.Delete)
	})

	// Ver tareas y cambiar su propio estado: cualquier usuario logueado
	r.Group(func(r chi.Router) {
		r.Use(custommw.RequireAuth)
		r.Get("/tasks", taskHandler.List)
		r.Patch("/tasks/{id}/status", taskHandler.UpdateStatus)
	})

	// Crear, editar y borrar tareas: solo owner y admin
	r.Group(func(r chi.Router) {
		r.Use(custommw.RequireAuth)
		r.Use(custommw.RequireRole(models.RoleOwner, models.RoleAdmin))
		r.Post("/tasks", taskHandler.Create)
		r.Put("/tasks/{id}", taskHandler.Update)
		r.Delete("/tasks/{id}", taskHandler.Delete)
	})

	r.Group(func(r chi.Router) {
		r.Use(custommw.RequireAuth)
		r.Use(custommw.RequireRole(models.RoleOwner, models.RoleAdmin, models.RoleEmployee))
		r.Get("/sales", saleHandler.List)
		r.Get("/sales/{id}", saleHandler.Get)
		r.Post("/sales", saleHandler.Create)
	})

	log.Println("servidor corriendo en :8080")
	http.ListenAndServe(":8080", r)

}
