# ☕ Coffe

> *"Hecho por y para estudiantes"*

**Coffe** es un sistema web completo de punto de venta (POS), gestión operativa, comandas en tiempo real y contabilidad diseñado específicamente para la administración eficiente de cafeterías.

---

## 🚀 Características Principales

1. **🛒 Punto de Venta (POS)**
   - Catálogo interactivo de productos con filtrado rápido.
   - Carrito de compras responsivo.
   - Modal emergente de cobro con registro de **Nombre del Cliente** y **Método de Pago** (`Efectivo`, `Transferencia` o `Mixto`).
   - Calculadora automática de cambio a entregar.

2. **📜 Registro e Historial de Ventas**
   - Historial detallado de transacciones con búsqueda por cliente o vendedor.
   - Filtros dinámicos por forma de pago.
   - Modal de desglose de orden mostrando productos, cantidad, precio unitario y total.

3. **🛎️ Sistema de Comandas en Tiempo Real (Cocina / Barra)**
   - Generación automática de tickets de pedido al realizar una venta.
   - Tablero Kanban interactivo con estados: `Pendientes` ➔ `En preparación` ➔ `Listo` ➔ `Entregados`.
   - Sincronización en tiempo real vía Server-Sent Events (SSE).
   - Acceso para actualización de estado disponible para cualquier rol del equipo.

4. **📦 Control de Inventario con Seguridad por Roles**
   - Monitoreo de insumos con alertas de stock mínimo.
   - **Permisos por rol**: Los empleados tienen vista de solo lectura; la creación/edición/eliminación directa queda restringida a Administradores y Dueños.

5. **💰 Sistema de Contabilidad y Reabastecimiento**
   - Panel KPI con ingresos totales, gastos totales, balance neto (ganancias) y desglose de efectivo vs. transferencia.
   - Registro de egresos por categorías (Insumos, Servicios, Mantenimiento, Nómina, Otros).
   - **Integración con Inventario**: Al registrar compras de insumos en Contabilidad, las unidades compradas se suman automáticamente al inventario en la misma transacción.

6. **✅ Gestión de Tareas del Personal**
   - Asignación y seguimiento de pendientes con fechas límite.

7. **👤 Roles y Permisos de Usuario**
   - 👑 **Dueño (`owner`)**: Control total del sistema y gestión de usuarios.
   - 🛡️ **Administrador (`admin`)**: Gestión de catálogo, recetas, inventario, tareas y contabilidad.
   - ☕ **Empleado (`employee`)**: Operación del POS, registro de ventas, comandas y lectura de inventario.

---

## 🛠️ Tecnologías Utilizadas

- **Backend**: Go 1.26, Router `Chi`, Driver PostgreSQL `pgx/v5`, Autenticación JWT, Server-Sent Events (SSE) para eventos en vivo.
- **Frontend**: React 19, Vite, React Router v7, Sistema de diseño en Vanilla CSS (Espresso & Amber Theme), PWA Support.
- **Base de Datos**: PostgreSQL 14+.

---

## 💻 Instalación y Ejecución Local

### Prerrequisitos
- Go 1.22+
- Node.js 18+ y npm
- PostgreSQL corriendo localmente

### 1. Configuración de la Base de Datos y Backend (Go)

1. Crea la base de datos en PostgreSQL:
   ```sql
   CREATE DATABASE "Cafeteria";
   ```

2. Ejecuta las migraciones SQL en la carpeta `Cafeteria/migrations`:
   ```bash
   psql "postgres://postgres:TU_PASSWORD@localhost:5432/Cafeteria?sslmode=disable" -f Cafeteria/migrations/000001_create_users.up.sql
   # ... Ejecutar secuencialmente hasta la 000012:
   psql "postgres://postgres:TU_PASSWORD@localhost:5432/Cafeteria?sslmode=disable" -f Cafeteria/migrations/000012_update_sales_and_create_comandas_accounting.up.sql
   ```

3. Crea el archivo `.env` en la carpeta `Cafeteria/`:
   ```env
   DB_URL=postgres://postgres:TU_PASSWORD@localhost:5432/Cafeteria?sslmode=disable
   JWT_SECRET=tu_clave_secreta_super_segura
   ```

4. Compila y ejecuta el servidor backend:
   ```bash
   cd Cafeteria
   go run ./cmd/server
   ```
   *El servidor iniciará en `http://localhost:8080`.*

### 2. Configuración del Frontend (React / Vite)

1. Ingresa a la carpeta `Cafeteriaweb`:
   ```bash
   cd Cafeteriaweb
   npm install
   ```

2. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```
   *El frontend abrirá en `http://localhost:5173`.*

---

## ☁️ Guía de Despliegue en la Nube

Para desplegar en producción de forma gratuita o económica:

- **Base de Datos & Backend**: [Render.com](https://render.com) o [Railway.app](https://railway.app)
  - Configura el servicio de Go especificando Root Directory `Cafeteria`, Build Command `go build -o server ./cmd/server` y Start Command `./server`.
  - Define las variables de entorno `DB_URL` y `JWT_SECRET`.
- **Frontend**: [Vercel.com](https://vercel.com)
  - Despliega seleccionando Root Directory `Cafeteriaweb` y Framework `Vite`.

---

## 📄 Licencia

Este proyecto fue desarrollado con ❤️ para la comunidad estudiantil.
