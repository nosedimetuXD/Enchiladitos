package handlers

import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

// getTimeCondition construye un fragmento SQL de filtro por fecha para la columna `col`.
//
// IMPORTANTE: los valores de usuario (startDate, endDate) NUNCA se interpolan directamente
// en el SQL. Se devuelven como placeholders posicionales `?` junto con sus argumentos; el
// llamador debe pasar el fragmento por bindPlaceholders() antes de ejecutarlo, y pasar los
// argumentos devueltos en el mismo orden al método Query/QueryRow/Exec de pgx.
//
// `col`, `period`, `yearParam` y `monthParam` no provienen de texto libre del usuario que
// se use como SQL (col es un identificador interno; year/month se parsean a enteros con
// strconv antes de interpolarse con %d; period se compara contra una lista fija), por lo que
// no representan riesgo de inyección.
func getTimeCondition(col string, period, startDate, endDate, yearParam, monthParam string) (string, []any) {
	if startDate != "" && endDate != "" {
		cond := fmt.Sprintf(
			"(%s AT TIME ZONE 'America/Bogota')::date >= ?::date AND (%s AT TIME ZONE 'America/Bogota')::date <= ?::date",
			col, col,
		)
		return cond, []any{startDate, endDate}
	}
	if yearParam != "" {
		y, _ := strconv.Atoi(yearParam)
		if monthParam != "" {
			m, _ := strconv.Atoi(monthParam)
			if y > 2000 && m >= 1 && m <= 12 {
				return fmt.Sprintf(
					"EXTRACT(YEAR FROM (%s AT TIME ZONE 'America/Bogota')) = %d AND EXTRACT(MONTH FROM (%s AT TIME ZONE 'America/Bogota')) = %d",
					col, y, col, m,
				), nil
			}
		} else if y > 2000 {
			return fmt.Sprintf("EXTRACT(YEAR FROM (%s AT TIME ZONE 'America/Bogota')) = %d", col, y), nil
		}
	}
	switch period {
	case "today":
		return fmt.Sprintf("(%s AT TIME ZONE 'America/Bogota')::date = (now() AT TIME ZONE 'America/Bogota')::date", col), nil
	case "week":
		return fmt.Sprintf("(%s AT TIME ZONE 'America/Bogota') >= ((now() AT TIME ZONE 'America/Bogota') - INTERVAL '7 days')", col), nil
	case "month":
		return fmt.Sprintf("(%s AT TIME ZONE 'America/Bogota') >= date_trunc('month', now() AT TIME ZONE 'America/Bogota')", col), nil
	case "prev_month":
		return fmt.Sprintf("(%s AT TIME ZONE 'America/Bogota') >= date_trunc('month', (now() AT TIME ZONE 'America/Bogota') - INTERVAL '1 month') AND (%s AT TIME ZONE 'America/Bogota') < date_trunc('month', now() AT TIME ZONE 'America/Bogota')", col, col), nil
	case "year":
		return fmt.Sprintf("(%s AT TIME ZONE 'America/Bogota') >= date_trunc('year', now() AT TIME ZONE 'America/Bogota')", col), nil
	default:
		return "1=1", nil
	}
}

// validateDateRange rechaza start_date/end_date que no tengan formato YYYY-MM-DD antes de
// que lleguen a getTimeCondition, cerrando cualquier intento de inyección por ese campo
// además de la parametrización de bindPlaceholders.
func validateDateRange(startDate, endDate string) error {
	if startDate != "" {
		if _, err := time.Parse("2006-01-02", startDate); err != nil {
			return fmt.Errorf("start_date inválida, formato esperado YYYY-MM-DD")
		}
	}
	if endDate != "" {
		if _, err := time.Parse("2006-01-02", endDate); err != nil {
			return fmt.Errorf("end_date inválida, formato esperado YYYY-MM-DD")
		}
	}
	return nil
}

// bindPlaceholders reemplaza cada '?' de un fragmento SQL ensamblado dinámicamente por
// placeholders posicionales $1, $2... en el orden en que aparecen, para poder concatenar
// con seguridad varios fragmentos (cada uno con sus propios argumentos) en una sola query.
func bindPlaceholders(query string) string {
	if !strings.Contains(query, "?") {
		return query
	}
	var b strings.Builder
	b.Grow(len(query) + 8)
	n := 0
	for i := 0; i < len(query); i++ {
		if query[i] == '?' {
			n++
			b.WriteByte('$')
			b.WriteString(strconv.Itoa(n))
		} else {
			b.WriteByte(query[i])
		}
	}
	return b.String()
}
