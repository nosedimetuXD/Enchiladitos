package middleware

import (
	"log"
	"net/http"
	"time"
)

// RequestLogger registra cada petición SIN incluir el query string.
//
// El endpoint /events recibe el JWT como ?token=... (RequireAuthSSE, porque EventSource
// del navegador no soporta cabeceras custom). El logger por defecto de chi
// (middleware.Logger) registra la URL completa, incluido ese token, en logs de la
// aplicación y del proxy — una fuga de credenciales de sesión válidas durante su
// expiración (12h). Este logger solo registra el path, nunca la query string.
func RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)
		log.Printf("%s %s -> %d (%s)", r.Method, r.URL.Path, rec.status, time.Since(start))
	})
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (rec *statusRecorder) WriteHeader(code int) {
	rec.status = code
	rec.ResponseWriter.WriteHeader(code)
}
