package middleware

import "net/http"

// SecurityHeaders añade cabeceras de endurecimiento a todas las respuestas de la API.
// Como esta API solo devuelve JSON (nunca HTML/JS de terceros), una CSP restrictiva es
// segura y no rompe ningún cliente legítimo.
func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		h.Set("Permissions-Policy", "geolocation=(), camera=(), microphone=()")
		h.Set("Content-Security-Policy", "default-src 'none'")
		next.ServeHTTP(w, r)
	})
}
