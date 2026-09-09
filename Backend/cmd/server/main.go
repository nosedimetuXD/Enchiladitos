package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
	"github.com/go-chi/httprate"
	"github.com/joho/godotenv"

	"github.com/NosedimetuXD/cafeteria/internal/db"
	"github.com/NosedimetuXD/cafeteria/internal/events"
	"github.com/NosedimetuXD/cafeteria/internal/handlers"
	custommw "github.com/NosedimetuXD/cafeteria/internal/middleware"
	"github.com/NosedimetuXD/cafeteria/internal/models"
)

// allowedOrigins lee ALLOWED_ORIGINS (lista separada por comas) del entorno. Si no está
// configurada, cae a un valor de desarrollo local en vez de "*", para que un despliegue
// sin configurar no quede abierto a cualquier origen.
func allowedOrigins() []string {
	raw := strings.TrimSpace(os.Getenv("ALLOWED_ORIGINS"))
	if raw == "" {
		log.Println("ALLOWED_ORIGINS no configurada, usando origen de desarrollo por defecto (http://localhost:5173)")
		return []string{"http://localhost:5173"}
	}
	parts := strings.Split(raw, ",")
	origins := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			origins = append(origins, p)
		}
	}
	return origins
}

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
	r.Use(custommw.RequestLogger)
	r.Use(custommw.SecurityHeaders)

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   allowedOrigins(),
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Content-Type", "Authorization"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("ok"))
	})
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

	// Auth pública — limitada a 8 intentos por minuto por IP para dificultar fuerza bruta.
	r.With(httprate.LimitByIP(8, time.Minute)).Post("/login", authHandler.Login)

	// Eventos en tiempo real
	r.Group(func(r chi.Router) {
		r.Use(custommw.RequireAuthSSE)
		r.Get("/events", eventHandler.Stream)
	})

	// Rutas protegidas — accesibles a cualquier usuario autenticado (owner/admin/employee):
	// operación diaria del POS (ventas, lectura de catálogo/clientes, abonos, perfil propio).
	r.Group(func(r chi.Router) {
		r.Use(custommw.RequireAuth)

		// Perfil propio
		r.Get("/users/me", userHandler.GetSelf)
		r.Put("/users/me", userHandler.UpdateSelf)

		// Catálogo — solo lectura para operación de venta
		r.Get("/products", productHandler.List)
		r.Get("/products/{id}", productHandler.Get)

		// Clientes (CRM) — lectura, alta y edición son tarea operativa habitual
		r.Get("/customers", customerHandler.List)
		r.Get("/customers/{id}", customerHandler.Get)
		r.Get("/customers/{id}/account", customerHandler.GetAccount)
		r.Post("/customers", customerHandler.Create)
		r.Put("/customers/{id}", customerHandler.Update)
		r.Post("/customers/{id}/payments", customerHandler.CreatePayment)

		// Ventas (POS) — crear, listar y corregir ventas propias del turno
		r.Get("/sales", saleHandler.List)
		r.Get("/sales/{id}", saleHandler.Get)
		r.Post("/sales", saleHandler.Create)
		r.Put("/sales/{id}", saleHandler.Update)
	})

	// Rutas protegidas — solo Dueño/Administrador: gestión de inventario, borrados y
	// contabilidad/finanzas del negocio. Antes de este cambio RequireRole nunca se
	// aplicaba y cualquier cuenta autenticada (incl. "employee") tenía estos permisos.
	r.Group(func(r chi.Router) {
		r.Use(custommw.RequireAuth)
		r.Use(custommw.RequireRole(models.RoleOwner, models.RoleAdmin))

		// Productos & Stock — alta, edición, ajuste de inventario y borrado
		r.Post("/products", productHandler.Create)
		r.Put("/products/{id}", productHandler.Update)
		r.Patch("/products/{id}/stock", productHandler.AdjustStock)
		r.Delete("/products/{id}", productHandler.Delete)

		// Clientes — borrados
		r.Delete("/customers/{id}", customerHandler.Delete)
		r.Delete("/customer-payments/{id}", customerHandler.DeletePayment)

		// Ventas — borrado
		r.Delete("/sales/{id}", saleHandler.Delete)

		// Contabilidad & Finanzas — toda la sección es exclusiva del dueño/admin
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
