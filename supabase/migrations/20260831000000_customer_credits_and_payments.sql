-- ====================================================================
-- 🌶️ ENCHILADITOS - MIGRACIÓN: CRÉDITOS, DEUDAS Y ABONOS POR CLIENTE
-- ====================================================================

-- 1. Agregar soporte de cliente vinculado y saldo deudor en la tabla de ventas
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS pending_amount NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) NOT NULL DEFAULT 'paid';

-- 2. Asegurar que las ventas previas tengan paid_amount = total y pending_amount = 0
UPDATE sales 
SET paid_amount = total, 
    pending_amount = 0, 
    payment_status = 'paid' 
WHERE paid_amount = 0 AND pending_amount = 0 AND total > 0;

-- 3. Crear tabla de Abonos / Pagos de Clientes
CREATE TABLE IF NOT EXISTS customer_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50) NOT NULL DEFAULT 'efectivo',
    bank_details TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    registered_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Índices para acelerar consultas de estados de cuenta y deudas
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_payment_status ON sales(payment_status);
CREATE INDEX IF NOT EXISTS idx_customer_payments_customer_id ON customer_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_payments_created_at ON customer_payments(created_at);
