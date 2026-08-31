package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/go-chi/cors"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/joho/godotenv"

	"github.com/NosedimetuXD/cafeteria/internal/db"
	"github.com/NosedimetuXD/cafeteria/internal/events"
	"github.com/NosedimetuXD/cafeteria/internal/handlers"
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

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Content-Type", "Authorization"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("ok"))
	})

	authHandler := handlers.NewAuthHandler(pool)
	productHandler := handlers.NewProductHandler(pool)
	saleHandler := handlers.NewSaleHandler(pool, hub)
	userHandler := handlers.NewUserHandler(pool)
	customerHandler := handlers.NewCustomerHandler(pool, hub)
	accountingHandler := handlers.NewAccountingHandler(pool, hub)
	eventHandler := handlers.NewEventHandler(hub)

	// Auth pública
	r.Post("/login", authHandler.Login)

	// Eventos en tiempo real
	r.Group(func(r chi.Router) {
		r.Use(custommw.RequireAuthSSE)
		r.Get("/events", eventHandler.Stream)
	})

	// Rutas protegidas para el Dueño
	r.Group(func(r chi.Router) {
		r.Use(custommw.RequireAuth)

		// Perfil
		r.Get("/users/me", userHandler.GetSelf)
		r.Put("/users/me", userHandler.UpdateSelf)

		// Productos & Stock
		r.Get("/products", productHandler.List)
		r.Get("/products/{id}", productHandler.Get)
		r.Post("/products", productHandler.Create)
		r.Put("/products/{id}", productHandler.Update)
		r.Patch("/products/{id}/stock", productHandler.AdjustStock)
		r.Delete("/products/{id}", productHandler.Delete)

		// Clientes (CRM) & Cuentas/Créditos
		r.Get("/customers", customerHandler.List)
		r.Get("/customers/{id}", customerHandler.Get)
		r.Get("/customers/{id}/account", customerHandler.GetAccount)
		r.Post("/customers/{id}/payments", customerHandler.CreatePayment)
		r.Delete("/customer-payments/{id}", customerHandler.DeletePayment)
		r.Post("/customers", customerHandler.Create)
		r.Put("/customers/{id}", customerHandler.Update)
		r.Delete("/customers/{id}", customerHandler.Delete)

		// Ventas (POS) & Historial
		r.Get("/sales", saleHandler.List)
		r.Get("/sales/{id}", saleHandler.Get)
		r.Post("/sales", saleHandler.Create)
		r.Put("/sales/{id}", saleHandler.Update)
		r.Delete("/sales/{id}", saleHandler.Delete)

		// Contabilidad & Finanzas
		r.Get("/accounting/summary", accountingHandler.GetSummary)
		r.Get("/expenses", accountingHandler.ListExpenses)
		r.Post("/expenses", accountingHandler.CreateExpense)
		r.Put("/expenses/{id}", accountingHandler.UpdateExpense)
		r.Delete("/expenses/{id}", accountingHandler.DeleteExpense)

		r.Get("/incomes", accountingHandler.ListIncomes)
		r.Post("/incomes", accountingHandler.CreateIncome)
		r.Put("/incomes/{id}", accountingHandler.UpdateIncome)
		r.Delete("/incomes/{id}", accountingHandler.DeleteIncome)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("servidor corriendo en :%s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("error levantando servidor: %v", err)
	}
}
