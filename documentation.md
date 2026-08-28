# 📚 Especificación Técnica y Funcional de Enchiladitos

## 1. Visión General del Sistema

**Enchiladitos** es una solución informática de gestión comercial y gastronómica diseñada para optimizar los procesos de venta directa, control de inventario de insumos (chamoy, tajín, empaques, gomitas), registro de clientes (CRM), trazabilidad de ventas históricas, control de mermas y balance contable.

---

## 2. Arquitectura del Sistema

El sistema utiliza una arquitectura cliente-servidor desacoplada:

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
   - Autenticación con JSON Web Tokens (`JWT`) con claims de usuario y rol.
   - Manejo de puerto dinámico mediante variable `PORT` para despliegues en la nube (Render / Fly / VPS).
   - Generador y sincronizador de tablas automáticas al arrancar (`Auto-migration`).
2. **Frontend (`Frontend/` - React 19 / Vite)**:
   - Interfaz de usuario responsiva con paleta de colores de la marca Enchiladitos (Rojo Fuego `#dc2626`, Naranja Tajín `#ea580c`, Amarillo Picante `#f59e0b` y fondos vino/chamoy).
   - Enrutamiento con `React Router v7` y estado global con `AuthContext`.
   - PWA instalable con soporte offline y diseño táctil optimizado para móviles y tablets.

---

## 3. Modelo de Datos y Entidades

### 3.1. Clientes (`customers`)
- `id` (UUID, PK)
- `first_name` (VARCHAR 100)
- `last_name` (VARCHAR 100)
- `phone` (VARCHAR 30)
- `email` (VARCHAR 150)
- `notes` (TEXT)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### 3.2. Usuarios (`users`)
- `id` (UUID, PK)
- `username` (VARCHAR 100, UNIQUE)
- `password_hash` (TEXT)
- `role` (VARCHAR 20: `owner`, `admin`, `employee`)
- `avatar_url` (TEXT)
- `created_at` (TIMESTAMPTZ)

### 3.3. Productos y Recetas (`products`, `ingredients`, `product_ingredients`)
- `products`: Catálogo de productos en venta (gomitas escarchadas, sparkies, combos, etc.) con precio, descripción, categoría, imagen y estado activo/inactivo.
- `ingredients`: Insumos y materia prima (chamoy en gramos/mililitros, tajín en gramos, gomitas base, empaques, etc.) con stock actual, costo unitario y stock mínimo de alerta.
- `product_ingredients`: Receta técnica que define qué insumos y qué cantidad se descuenta del inventario por cada unidad de producto vendida.

### 3.4. Ventas (`sales`, `sale_items`)
- `sales`: Registro de transacciones con monto total, cliente asociado, fecha personalizada (`created_at`), cajero/vendedor, estado (`completada` o `cancelada`) y método de pago (efectivo, transferencias desglosadas por banco o mixto).
- `sale_items`: Desglose de productos, cantidades y precios unitarios correspondientes a cada venta.

### 3.5. Contabilidad y Mermas (`expenses`, `incomes`, `waste_reports`)
- `expenses`: Egresos por insumos, servicios, nómina, mantenimiento u otros gastos.
- `incomes`: Ingresos manuales extraordinarios.
- `waste_reports`: Reportes de mermas o daños accidentales de materia prima con deducción inmediata del stock de inventario.

---

## 4. Módulos y Flujos Operativos

### 4.1. Punto de Venta (POS) & Cobro
1. El cajero selecciona los productos deseados en la cuadrícula o mediante el buscador.
2. Selecciona o crea el cliente (o deja el valor predeterminado *Cliente General*).
3. Si es necesario ingresar una venta anterior, selecciona la fecha y hora en el selector de fecha.
4. Elige la forma de pago (Efectivo con cálculo de cambio, Transferencia bancaria o Pago Mixto).
5. Al procesar la venta:
   - Se descuentan automáticamente los insumos del inventario según las recetas.
   - Se registra la transacción en `sales`.
   - Se genera el recibo de venta para visualización o impresión física.

### 4.2. Módulo de Clientes (CRM)
- Permite crear, modificar y eliminar clientes.
- Permite iniciar una conversación por WhatsApp directamente con el cliente con un solo clic.
- Permite consultar el volumen de compras acumuladas de cada cliente.

### 4.3. Control de Inventario & Mermas
- Vista de existencias en tiempo real con semáforo de alerta para insumos bajos.
- Registro rápido de mermas con cálculo de costo estimado de la pérdida.

### 4.4. Historial de Ventas & Cancelaciones
- Registro cronológico con filtros rápidos (Hoy, Semana, Mes, Año o Rango personalizado).
- Posibilidad para el Dueño de cancelar una venta con reversión automática de insumos al stock.

### 4.5. Contabilidad & Estadísticas
- KPIs de facturación, egresos y utilidad neta real.
- Ranking de mejores productos y clientes más frecuentes.
