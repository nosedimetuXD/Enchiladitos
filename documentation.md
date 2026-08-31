# 📚 Especificación Técnica y Funcional de Enchiladitos

## 1. Visión General del Sistema

**Enchiladitos** es una solución informática de gestión comercial, contable y punto de venta diseñada para optimizar los procesos de venta directa de productos empaquetados, control de inventario de stock directo, gestión integral de clientes (CRM 360°), trazabilidad y edición de ventas históricas, control de gastos e ingresos editables y balance financiero neto.

---

## 2. Arquitectura del Sistema

```
[ Frontend React 19 / Vite ]  <--- HTTP REST API --->  [ Backend Go / Chi Router ]
         ^                                                     |
         |------------- Server-Sent Events (SSE) --------------|
                                                               |
                                                      [ PostgreSQL DB ]
```

### Componentes Principales:
1. **Backend (`Backend/` - Go Chi)**:
   - Enrutamiento con `go-chi/chi/v5`.
   - Conexión PostgreSQL con pool de conexiones `jackc/pgx/v5`.
   - Autenticación con JSON Web Tokens (`JWT`) para el Dueño/Administrador.
   - Migración y verificación de columnas automática al iniciar (`Auto-migration`).
2. **Frontend (`Frontend/` - React 19 / Vite)**:
   - Interfaz de usuario responsiva con paleta de colores de la marca Enchiladitos.
   - Enrutamiento con `React Router v7` y estado global con `AuthContext`.
   - Exportador universal a CSV para reportes de ventas, contabilidad y clientes.

---

## 3. Modelo de Datos y Entidades

### 3.1. Clientes (`customers`)
- `id` (UUID, PK)
- `first_name` (VARCHAR 100)
- `last_name` (VARCHAR 100)
- `phone` (VARCHAR 30)
- `email` (VARCHAR 150)
- `notes` (TEXT) - Preferencias y gustos del cliente
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### 3.2. Productos (`products`)
- `id` (UUID, PK)
- `name` (TEXT)
- `description` (TEXT)
- `price` (NUMERIC)
- `category` (TEXT)
- `image_url` (TEXT)
- `stock` (INT) - Unidades de producto empaquetado disponibles
- `min_stock_alert` (INT) - Umbral de alerta para stock bajo
- `tags` (TEXT) - Etiquetas de clasificación
- `active` (BOOLEAN)
- `created_at` / `updated_at` (TIMESTAMPTZ)

### 3.3. Ventas (`sales`, `sale_items`)
- `sales`:
  - `id` (UUID, PK)
  - `sold_by` (UUID) / `sold_by_name` (TEXT)
  - `customer_name` (TEXT)
  - `payment_method` (VARCHAR: `efectivo`, `transferencia`, `mixto`)
  - `cash_amount` (NUMERIC)
  - `transfer_amount` (NUMERIC)
  - `bank_details` (TEXT)
  - `subtotal` (NUMERIC)
  - `discount_percent` (NUMERIC)
  - `discount_amount` (NUMERIC)
  - `discount_reason` (TEXT)
  - `total` (NUMERIC)
  - `deducted_stock` (BOOLEAN)
  - `created_at` (TIMESTAMPTZ)
- `sale_items`:
  - `sale_id` (UUID, FK)
  - `product_id` (UUID)
  - `product_name` (TEXT)
  - `quantity` (INT)
  - `unit_price` (NUMERIC)

### 3.4. Contabilidad (`expenses`, `incomes`)
- `expenses`: `id`, `description`, `amount`, `category`, `payment_method`, `created_at`
- `incomes`: `id`, `description`, `amount`, `category`, `payment_method`, `created_at`

---

## 4. Módulos y Flujos Operativos

### 4.1. Punto de Venta (POS) & Cobro
1. Selección de productos con badge visual de existencias.
2. Aplicación opcional de descuentos (% o $) con motivo descriptivo.
3. Selección o creación de cliente.
4. Selección de método de pago (Efectivo con cambio, Transferencia desglosada por banco o Mixto).
5. Toggle de descuento de stock (activo por defecto) y fecha personalizada si es venta histórica.
6. Emisión de ticket impreso y botón de envío directo por WhatsApp.

### 4.2. CRM & Ficha 360°
- Timeline cronológico de compras por cliente.
- Plantillas de 1 clic para WhatsApp (Saludos, Cupones 10%, Nuevos lotes).
- Exportación de base de clientes a CSV.

### 4.3. Historial de Ventas Editable
- Filtros por fechas o periodos.
- Edición integral de ventas (`PUT /sales/:id`) con recálculo automático de stock.
- Eliminación con reversión de stock (`DELETE /sales/:id`).
- Exportación a CSV.

### 4.4. Contabilidad Completa
- Registro de gastos e ingresos con soporte para fechas pasadas.
- Edición (`PUT`) y Eliminación (`DELETE`) de cualquier movimiento contable.
- Balance neto en tiempo real y exportación de libros contables a CSV.
