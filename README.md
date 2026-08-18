# ☕ Toffe Coffee

> *"Hecho por y para estudiantes"*

**Toffe Coffee** es una plataforma web integral de Punto de Venta (POS), gestión operativa de inventario, comandas en tiempo real (KDS), control de mermas/daños, contabilidad financiera avanzada y estadísticas ejecutivas diseñada para la administración eficiente de cafeterías universitarias y comerciales.

---

## 🚀 Características Principales

### 🛒 1. Punto de Venta (POS) & Cobro Multi-Entidad
- Catálogo interactivo de productos con filtrado por categoría y búsqueda en tiempo real.
- Carrito de compras responsivo con cálculo de subtotal y total a pagar.
- **Formas de Pago Avanzadas**:
  - `Efectivo`: Cálculo automático de cambio a entregar.
  - `Transferencia`: Registro y selección rápida de bancos/entidades (*Nequi*, *Daviplata*, *Bancolombia*, *Nu*, *Bre-B / Llave*, etc.) con opción de **dividir el pago entre múltiples bancos**.
  - `Pago Mixto`: Combinación de efectivo + abonos digitales desglosados por banco con validación estricta de totales.
- Autocompletado de clientes habituales y ticket de recibo impreso/digital.

### 🛎️ 2. Comandas en Tiempo Real (KDS Cocina & Barista)
- Generación automática de tickets de comanda al confirmar cada venta en el POS.
- **Asignación de Preparador**: Las comandas pendientes inician en estado `Por asignar`. Al hacer clic en **"Iniciar Preparación"**, se asigna incondicionalmente el usuario activo que asume la comanda.
- **Botonera de Cancelación Directa**: Permite ejecutar `Cancelar Venta` en comandas pendientes. Al cancelar:
  - Cambia el estado de la comanda a `cancelado`.
  - **Devuelve automáticamente los insumos** descontados al inventario de ingredientes.
  - Excluye la venta de los totales facturados e ingresos contables.
- Sincronización instantánea entre pantallas mediante Server-Sent Events (SSE).

### 📜 3. Historial de Ventas con Estado & Cancelación Auditable
- Registro cronológico de todas las ventas cobradas.
- **Columna de Estado**: Muestra insignias claras de `COMPLETADA` o `CANCELADA`.
- **Cancelación de Ventas**: Permite cancelar cualquier venta completada sin eliminar el registro del sistema. La venta permanece marcada como `CANCELADA` para fines de auditoría, descontando su monto del total facturado y retornando los ingredientes al inventario.

### 💼 4. Contabilidad & Registrar Ingreso Manual (Exclusivo Dueño)
- Accesible de forma estricta para el rol **Dueño (`owner`)**.
- **Registrar Ingreso Manual**: Incorpora la misma lógica avanzada de formas de pago (**Efectivo**, **Transferencia** con desglose de entidades/bancos y **Pago Mixto**).
- **Registrar Gasto**: Permite clasificar egresos por categoría (Insumos, Servicios, Mantenimiento, Nómina, Otros) con reabastecimiento directo de insumos.
- Botones de acción alineados limpiamente en una sola línea horizontal.
- Flujo de caja combinado con ventas (+), ingresos manuales (+), gastos (-) y mermas (-).

### ⚠️ 5. Control de Mermas y Pérdidas de Insumos
- **Acceso General**: Todos los roles (*Dueño*, *Administrador*, *Empleado*) pueden reportar pérdidas o daños de materia prima.
- **Descuento Inmediato**: Resta automáticamente del stock de inventario la cantidad reportada y la registra como pérdida operativa.

### 🏆 6. Estadísticas Ejecutivas del Mes (Exclusivo Dueño)
- **Métricas Clave**: Ingresos Totales del Mes, Gastos Totales y Ganancia Neta Real.
- 🥇 **Mejor Vendedor del Mes**: Usuario con mayor volumen de facturación.
- 🔥 **Top 10 Productos Más Vendidos**: Ranking por unidades vendidas.
- 🏆 **Top 10 Clientes Frecuentes**: Ranking por monto acumulado de compra.

---

## 🛡️ Matriz de Roles y Permisos

| Rol | POS & Ventas | Comandas & Cocina | Reportar Mermas | Inventario & Productos | Historial Ventas | Contabilidad & Gastos | Estadísticas Ejecutivo | Usuarios |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| ☕ **Empleado** | ✅ | ✅ | ✅ | 👁️ Lectura | ✅ | ❌ | ❌ | ❌ |
| 🛡️ **Administrador** | ✅ | ✅ | ✅ | ✅ Edición | ✅ | ❌ | ❌ | ❌ |
| 👑 **Dueño** | ✅ | ✅ | ✅ | ✅ Edición | ✅ | ✅ | ✅ | ✅ |

---

## 🛠️ Arquitectura Tecnológica

- **Backend**: Go 1.26, Router `Chi`, Driver PostgreSQL `pgx/v5`, Autenticación JWT, Server-Sent Events (SSE).
- **Frontend**: React 19, Vite, React Router v7, Tailwind CSS / Custom Styling (Espresso Roasted Design), PWA.
- **Base de Datos**: PostgreSQL 14+ (Supabase / Local).

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
   *El servidor escuchará en `http://localhost:8080`.*

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

Desarrollado con ❤️ para la gestión eficiente de cafeterías y negocios gastronómicos.
