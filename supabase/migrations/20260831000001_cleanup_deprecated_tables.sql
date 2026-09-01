-- ====================================================================
-- ENCHILADITOS - LIMPIEZA DE TABLAS OBSOLETAS
-- ====================================================================

-- 1. Eliminar comandas y sus items (ya no se usan en el POS simplificado)
DROP TABLE IF EXISTS comanda_items CASCADE;
DROP TABLE IF EXISTS comandas CASCADE;

-- 2. Eliminar tablas antiguas de recetas, mermas, tareas e ingredientes
DROP TABLE IF EXISTS waste_reports CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS product_ingredients CASCADE;
DROP TABLE IF EXISTS recipes CASCADE;
DROP TABLE IF EXISTS ingredients CASCADE;
