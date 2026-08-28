-- Supabase Auto-Migration for Enchiladitos Database Schema

-- 1. Extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Usuarios
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'employee')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Clientes
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL DEFAULT '',
    phone VARCHAR(30) DEFAULT '',
    email VARCHAR(150) DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Productos
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Insumos e Inventario
CREATE TABLE IF NOT EXISTS ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    quantity NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    unit VARCHAR(20) NOT NULL,
    min_threshold NUMERIC(10,2) CHECK (min_threshold >= 0),
    min_quantity NUMERIC(10,2) DEFAULT 5,
    unit_cost NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Recetas (Relación producto - insumo)
CREATE TABLE IF NOT EXISTS product_ingredients (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity_used NUMERIC(10,2) NOT NULL CHECK (quantity_used > 0),
    PRIMARY KEY (product_id, ingredient_id)
);

-- 7. Ventas e Ítems de venta
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sold_by UUID REFERENCES users(id) ON DELETE SET NULL,
    sold_by_name VARCHAR(100) DEFAULT '',
    customer_name VARCHAR(100) NOT NULL DEFAULT 'Cliente General',
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    payment_method VARCHAR(20) NOT NULL DEFAULT 'efectivo' CHECK (payment_method IN ('efectivo', 'transferencia', 'mixto')),
    cash_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (cash_amount >= 0),
    transfer_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (transfer_amount >= 0),
    bank_details TEXT DEFAULT '',
    total NUMERIC(10,2) NOT NULL CHECK (total >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sale_items (
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    product_name VARCHAR(150) DEFAULT '',
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
    PRIMARY KEY (sale_id, product_id)
);

-- 8. Tareas
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(150) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done')),
    assigned_to UUID REFERENCES users(id),
    created_by UUID NOT NULL REFERENCES users(id),
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Contabilidad y Gastos
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    category VARCHAR(50) NOT NULL CHECK (category IN ('insumos', 'servicios', 'mantenimiento', 'nomina', 'otros')),
    payment_method VARCHAR(20) NOT NULL DEFAULT 'efectivo' CHECK (payment_method IN ('efectivo', 'transferencia')),
    registered_by UUID NOT NULL REFERENCES users(id),
    ingredient_id UUID REFERENCES ingredients(id) ON DELETE SET NULL,
    quantity_added NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (quantity_added >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Mermas y Daños
CREATE TABLE IF NOT EXISTS waste_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity_lost NUMERIC NOT NULL CHECK (quantity_lost > 0),
    unit_cost NUMERIC DEFAULT 0,
    estimated_loss NUMERIC DEFAULT 0,
    reason TEXT NOT NULL,
    reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Índices de optimización
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at DESC);
