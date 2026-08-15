-- Actualizar tabla sales para cliente y método de pago
ALTER TABLE sales ADD COLUMN customer_name VARCHAR(100) NOT NULL DEFAULT 'Cliente General';
ALTER TABLE sales ADD COLUMN payment_method VARCHAR(20) NOT NULL DEFAULT 'efectivo' CHECK (payment_method IN ('efectivo', 'transferencia', 'mixto'));
ALTER TABLE sales ADD COLUMN cash_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (cash_amount >= 0);
ALTER TABLE sales ADD COLUMN transfer_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (transfer_amount >= 0);

-- Tabla de comandas (pedidos de cocina / barra)
CREATE TABLE comandas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number SERIAL,
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    customer_name VARCHAR(100) NOT NULL DEFAULT 'Cliente General',
    status VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_preparacion', 'listo', 'entregado', 'cancelado')),
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de items de comanda
CREATE TABLE comanda_items (
    comanda_id UUID NOT NULL REFERENCES comandas(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    product_name VARCHAR(150) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    notes TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (comanda_id, product_id)
);

-- Tabla de contabilidad / gastos
CREATE TABLE expenses (
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

CREATE INDEX idx_comandas_status ON comandas(status);
CREATE INDEX idx_comandas_created_at ON comandas(created_at DESC);
CREATE INDEX idx_expenses_created_at ON expenses(created_at DESC);
