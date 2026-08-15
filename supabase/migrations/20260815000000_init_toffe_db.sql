-- Supabase Auto-Migration for Toffe Database Schema

-- 1. Usuarios
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'employee')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Productos
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Insumos e Inventario
CREATE TABLE IF NOT EXISTS ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    quantity NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    unit VARCHAR(20) NOT NULL,
    min_threshold NUMERIC(10,2) CHECK (min_threshold >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Recetas (Relacion producto - insumo)
CREATE TABLE IF NOT EXISTS product_ingredients (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity_used NUMERIC(10,2) NOT NULL CHECK (quantity_used > 0),
    PRIMARY KEY (product_id, ingredient_id)
);

-- 5. Ventas e Ítems de venta
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sold_by UUID NOT NULL REFERENCES users(id),
    customer_name VARCHAR(100) NOT NULL DEFAULT 'Cliente General',
    payment_method VARCHAR(20) NOT NULL DEFAULT 'efectivo' CHECK (payment_method IN ('efectivo', 'transferencia', 'mixto')),
    cash_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (cash_amount >= 0),
    transfer_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (transfer_amount >= 0),
    total NUMERIC(10,2) NOT NULL CHECK (total >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sale_items (
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
    PRIMARY KEY (sale_id, product_id)
);

-- 6. Tareas
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

-- 7. Comandas de cocina
CREATE TABLE IF NOT EXISTS comandas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number SERIAL,
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    customer_name VARCHAR(100) NOT NULL DEFAULT 'Cliente General',
    status VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_preparacion', 'listo', 'entregado', 'cancelado')),
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comanda_items (
    comanda_id UUID NOT NULL REFERENCES comandas(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    product_name VARCHAR(150) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    notes TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (comanda_id, product_id)
);

-- 8. Contabilidad y Gastos
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

-- 9. Indices de optimizacion
CREATE INDEX IF NOT EXISTS idx_comandas_status ON comandas(status);
CREATE INDEX IF NOT EXISTS idx_comandas_created_at ON comandas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at DESC);
