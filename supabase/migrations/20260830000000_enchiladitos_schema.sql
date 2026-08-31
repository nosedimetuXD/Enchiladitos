-- ====================================================================
-- 🌶️ ENCHILADITOS - SCHEMA OFICIAL PARA SUPABASE (POSTGRESQL)
-- ====================================================================

-- 1. Extensión para generación de UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tabla de Usuarios (Autenticación del Dueño/Admin)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'owner',
    avatar_url TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tabla de Productos (Catálogo & Stock Directo)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
    category VARCHAR(100) NOT NULL DEFAULT 'Gomitas',
    image_url TEXT DEFAULT '',
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    min_stock_alert INT NOT NULL DEFAULT 5,
    tags TEXT DEFAULT '',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Tabla de Clientes (CRM 360°)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) DEFAULT '',
    phone VARCHAR(30) DEFAULT '',
    email VARCHAR(150) DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Tabla de Ventas (POS & Historial Editable)
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sold_by UUID REFERENCES users(id) ON DELETE SET NULL,
    sold_by_name VARCHAR(100) DEFAULT '',
    customer_name VARCHAR(255) NOT NULL DEFAULT 'Cliente General',
    payment_method VARCHAR(50) NOT NULL DEFAULT 'efectivo',
    cash_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    transfer_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    bank_details TEXT DEFAULT '',
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount_reason TEXT DEFAULT '',
    total NUMERIC(10,2) NOT NULL DEFAULT 0,
    deducted_stock BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Tabla de Ítems de Venta (Detalle de productos vendidos)
CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL DEFAULT '',
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL DEFAULT 0
);

-- 7. Tabla de Gastos (Contabilidad)
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    category VARCHAR(50) NOT NULL DEFAULT 'otros',
    payment_method VARCHAR(50) NOT NULL DEFAULT 'efectivo',
    registered_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Tabla de Ingresos Extraordinarios (Contabilidad)
CREATE TABLE IF NOT EXISTS incomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    category VARCHAR(50) NOT NULL DEFAULT 'otros',
    payment_method VARCHAR(50) NOT NULL DEFAULT 'efectivo',
    registered_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incomes_created_at ON incomes(created_at DESC);

-- 10. Datos iniciales (Opcional - Usuario Admin predeterminado)
-- Password por defecto: 'admin12345' (hash bcrypt)
INSERT INTO users (username, password_hash, role)
VALUES ('admin', '$2a$10$7vN3fQ1c1jYjP2ZgA8bF7uM3F1sY9V0sM4rN1hE5.L0eE7g6yC4Wa', 'owner')
ON CONFLICT (username) DO NOTHING;
