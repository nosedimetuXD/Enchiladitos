# ☕ Toffe

> *"Hecho por y para estudiantes"*

**Toffe** es un sistema web completo de punto de venta (POS), gestión operativa, comandas en tiempo real, contabilidad avanzada y estadísticas ejecutivas diseñado para la administración eficiente de cafeterías universitarias y comerciales.

---

## 🚀 Características Principales

1. **🛒 Punto de Venta (POS) & Autocompletado de Clientes**
   - Catálogo interactivo de productos con búsqueda por nombre.
   - Carrito de compras responsivo.
   - Modal emergente de cobro con **autocompletado de clientes anteriores** (`datalist`), permitiendo elegir clientes frecuentes o ingresar clientes nuevos libremente.
   - Opciones de pago: `Efectivo`, `Transferencia bancaria` o `Pago Mixto`.
   - Cálculo automático de cambio a entregar.

2. **📜 Historial Detallado de Ventas**
   - Registro de transacciones con búsqueda por cliente o vendedor.
   - Filtros por forma de pago.
   - Modal de desglose de orden mostrando productos, cantidades, precio unitario y total.

3. **🛎️ Sistema de Comandas Diarias en Tiempo Real (Cocina & Barra)**
   - Generación automática de tickets de pedido al confirmar una venta en el POS.
   - **Reinicio Diario Automático**: El tablero filtra pedidos por el día en curso y comandas activas pendientes para iniciar cada mañana limpio.
   - Tablero Kanban con estados: `Pendientes` ➔ `En preparación` ➔ `Listo` ➔ `Entregados`.
   - Sincronización en vivo vía Server-Sent Events (SSE).

4. **📊 Módulo de Estadísticas Ejecutivas del Mes (Exclusivo Dueño)**
   - Panel de control ejecutivo accesible únicamente para el **Dueño (`owner`)** en `/stats` y `/accounting`.
   - **Métricas Clave**: Ventas Totales del Mes, Gastos Totales del Mes y Ganancia Neta.
   - 🥇 **Mejor Vendedor del Mes**: Usuario de cualquier rol que registró el mayor monto vendido en el mes.
   - 🔥 **Producto Más Vendido del Mes**: Producto estrella con mayor volumen de unidades vendidas e ingreso generado.
   - 🏆 **Top 5 Clientes**: Ranking de los 5 clientes que más han comprado en el mes con monto total y número de órdenes.

5. **📦 Control de Inventario con Seguridad por Roles**
   - Monitoreo de insumos con alertas de stock mínimo.
   - Permisos restringidos: La edición directa de inventario queda reservada a Administradores y Dueños.

6. **💰 Sistema de Contabilidad & Reabastecimiento**
   - Reporte de ingresos, gastos y balance neto por periodos (`Hoy`, `Semana`, `Mes`, `Histórico`).
   - Registro de gastos por categorías (Insumos, Servicios, Mantenimiento, Nómina, Otros).
   - **Reabastecimiento Directo**: Al registrar compras de materia prima, la cantidad comprada se suma automáticamente al stock de inventario en una sola transacción SQL.

7. **📱 Interfaz Adaptativa & Panel Lateral Colapsable**
   - **Sidebar Colapsable (`❮` / `❯`)**: Permite colapsar el menú a modo compacto de íconos o expandirlo libremente (con persistencia en `localStorage`).
   - Diseño responsivo ajustado para celulares, tablets y computadoras de escritorio.

8. **👤 Roles y Permisos de Usuario**
   - 👑 **Dueño (`owner`)**: Control total, reportes ejecutivos, estadísticas mensuales y gestión de usuarios.
   - 🛡️ **Administrador (`admin`)**: Gestión de productos, recetas, inventario, tareas y contabilidad.
   - ☕ **Empleado (`employee`)**: Operación del POS, ventas, comandas de cocina y consulta de inventario.

---

## 🛠️ Tecnologías Utilizadas

- **Backend**: Go 1.26, Router `Chi`, Driver PostgreSQL `pgx/v5`, Autenticación JWT, Server-Sent Events (SSE).
- **Frontend**: React 19, Vite, React Router v7, Vanilla CSS (Espresso & Amber Theme), PWA Support.
- **Base de Datos**: PostgreSQL 14+ (Supabase / Local).
- **Infraestructura**:
  - 🗄️ **Base de Datos**: Supabase PostgreSQL.
  - ⚡ **Backend**: Render.com (Go Web Service).
  - 🌐 **Frontend**: Vercel.com (React Vite App).

---

## 💻 Instalación y Ejecución Local

### Prerrequisitos
- Go 1.22+
- Node.js 18+ y npm
- PostgreSQL corriendo localmente

### 1. Backend en Go (`Cafeteria/`)

1. Crea la base de datos en PostgreSQL:
   ```sql
   CREATE DATABASE "Cafeteria";
   ```

2. Configura las variables en `Cafeteria/.env`:
   ```env
   DB_URL=postgres://postgres:TU_PASSWORD@localhost:5432/Cafeteria?sslmode=disable
   JWT_SECRET=tu_clave_secreta_super_segura
   ```

3. Compila y ejecuta el servidor backend:
   ```bash
   cd Cafeteria
   go run ./cmd/server
   ```
   *El servidor iniciará en `http://localhost:8080`.*

### 2. Frontend en React (`Cafeteriaweb/`)

1. Instala las dependencias e inicia Vite:
   ```bash
   cd Cafeteriaweb
   npm install
   npm run dev
   ```
   *El frontend abrirá en `http://localhost:5173`.*

---

## 📄 Licencia

Desarrollado con ❤️ para la gestión eficiente de cafeterías universitarias.
