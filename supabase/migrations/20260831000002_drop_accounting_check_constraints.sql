-- ====================================================================
-- ENCHILADITOS - ELIMINAR RESTRICCIONES CHECK EN GASTOS E INGRESOS
-- ====================================================================

-- 1. Gastos (expenses)
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_category_check;
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_payment_method_check;
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_registered_by_fkey;
ALTER TABLE expenses ALTER COLUMN registered_by DROP NOT NULL;
ALTER TABLE expenses ADD CONSTRAINT expenses_registered_by_fkey FOREIGN KEY (registered_by) REFERENCES users(id) ON DELETE SET NULL;

-- 2. Ingresos (incomes)
ALTER TABLE incomes DROP CONSTRAINT IF EXISTS incomes_category_check;
ALTER TABLE incomes DROP CONSTRAINT IF EXISTS incomes_payment_method_check;
ALTER TABLE incomes DROP CONSTRAINT IF EXISTS incomes_registered_by_fkey;
ALTER TABLE incomes ALTER COLUMN registered_by DROP NOT NULL;
ALTER TABLE incomes ADD CONSTRAINT incomes_registered_by_fkey FOREIGN KEY (registered_by) REFERENCES users(id) ON DELETE SET NULL;
