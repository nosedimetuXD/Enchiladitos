CREATE TABLE ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    unit TEXT NOT NULL,                    -- kg, litros, unidades, etc.
    quantity NUMERIC(10,3) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    min_threshold NUMERIC(10,3),           -- para alertas de stock bajo
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);