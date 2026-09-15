package handlers

import (
	"strings"
	"testing"
)

// TestGetTimeCondition_NeverInterpolatesRawInput es una prueba de regresión directa del
// hallazgo C-01: start_date/end_date NUNCA deben aparecer literalmente en el SQL devuelto;
// deben viajar solo como argumentos, referenciados por placeholders '?'.
func TestGetTimeCondition_NeverInterpolatesRawInput(t *testing.T) {
	payloads := []string{
		"2999-01-02'::date OR 1=1 --",
		"2999-01-02'::date OR (SELECT count(*) FROM users) >= 1 --",
		"'; DROP TABLE users; --",
	}

	for _, payload := range payloads {
		cond, args := getTimeCondition("created_at", "", "2000-01-01", payload, "", "")

		if strings.Contains(cond, payload) {
			t.Fatalf("el payload %q apareció interpolado en el SQL: %q", payload, cond)
		}
		if !strings.Contains(cond, "?") {
			t.Fatalf("se esperaban placeholders '?' en el fragmento SQL, got %q", cond)
		}
		if len(args) != 2 {
			t.Fatalf("se esperaban 2 argumentos (start, end), got %d: %v", len(args), args)
		}
		if args[1] != payload {
			t.Fatalf("el payload debía viajar como argumento tal cual, got %v", args[1])
		}
	}
}

func TestGetTimeCondition_YearMonthOnlyProducesIntegers(t *testing.T) {
	cond, args := getTimeCondition("created_at", "", "", "", "2026", "9")
	if args != nil {
		t.Errorf("year/month no deberían generar argumentos posicionales, got %v", args)
	}
	if !strings.Contains(cond, "= 2026") || !strings.Contains(cond, "= 9") {
		t.Errorf("se esperaban los enteros 2026 y 9 interpolados directamente, got %q", cond)
	}
}

func TestGetTimeCondition_UnknownPeriodFallsBackSafely(t *testing.T) {
	cond, args := getTimeCondition("created_at", "not-a-real-period'; DROP TABLE users; --", "", "", "", "")
	if cond != "1=1" {
		t.Errorf("se esperaba el fallback fijo 1=1, got %q", cond)
	}
	if args != nil {
		t.Errorf("no se esperaban argumentos, got %v", args)
	}
}

func TestBindPlaceholders_SequentialNumbering(t *testing.T) {
	got := bindPlaceholders("a >= ? AND b <= ? AND c = ?")
	want := "a >= $1 AND b <= $2 AND c = $3"
	if got != want {
		t.Errorf("bindPlaceholders() = %q, want %q", got, want)
	}
}

func TestBindPlaceholders_MultipleFragmentsRenumberAcrossConcatenation(t *testing.T) {
	condA, _ := getTimeCondition("s.created_at", "", "2000-01-01", "2000-01-02", "", "")
	condB, _ := getTimeCondition("i.created_at", "", "2000-01-03", "2000-01-04", "", "")

	combined := bindPlaceholders("SELECT 1 WHERE (" + condA + ") OR (" + condB + ")")
	// 4 placeholders en total (2 por cada fragmento), numerados $1..$4 en orden de aparición.
	for i := 1; i <= 4; i++ {
		want := "$" + string(rune('0'+i))
		if !strings.Contains(combined, want) {
			t.Errorf("se esperaba %q en la query combinada, got %q", want, combined)
		}
	}
	if strings.Contains(combined, "?") {
		t.Errorf("no debían quedar '?' sin reemplazar: %q", combined)
	}
}

func TestValidateDateRange(t *testing.T) {
	cases := []struct {
		name       string
		start, end string
		wantErr    bool
	}{
		{"vacío es válido (sin filtro)", "", "", false},
		{"fechas bien formadas", "2026-01-01", "2026-01-31", false},
		{"start_date con inyección", "2000-01-01'; DROP TABLE users; --", "2026-01-31", true},
		{"end_date con inyección", "2026-01-01", "2999-01-02'::date OR 1=1 --", true},
		{"formato no soportado", "01/01/2026", "31/01/2026", true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := validateDateRange(tc.start, tc.end)
			if (err != nil) != tc.wantErr {
				t.Errorf("validateDateRange(%q, %q) error = %v, wantErr %v", tc.start, tc.end, err, tc.wantErr)
			}
		})
	}
}
