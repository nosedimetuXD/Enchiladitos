package db

import (
	"context"
	"os"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func Connect(ctx context.Context) (*pgxpool.Pool, error) {
	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		dbURL = os.Getenv("DATABASE_URL")
	}
	config, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		return nil, err
	}

	// Desactivar caché de prepared statements para compatibilidad con PgBouncer / Supabase Supavisor
	config.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol
	config.ConnConfig.StatementCacheCapacity = 0

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		return nil, err
	}
	return pool, nil
}
