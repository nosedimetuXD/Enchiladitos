# 🌶️ Enchiladitos - Sistema de Gestión & Punto de Venta (POS)

> *"Sabor, Chamoy y Fuego"*

**Enchiladitos** es una plataforma web moderna e integral de Punto de Venta (POS), control de inventario de insumos y recetas, gestión de clientes (CRM), contabilidad financiera, registro de mermas y estadísticas ejecutivas diseñada a la medida para la operación de Enchiladitos.

---

## 🚀 Características Principales

### 🛒 1. Punto de Venta (POS) & Cobro Rápido
- Catálogo visual de productos (Gomitas Escarchadas, Sparkies Enchilados, Combos, etc.) con búsqueda y filtros por categoría.
- Carrito de compras responsivo con cálculo inmediato de total y cambio a devolver en efectivo.
- **Asociación y Búsqueda de Clientes**: Autocompletado directo de clientes registrados o ingreso rápido de nuevos clientes.
- **Registro de Ventas en Fechas Pasadas**: Selector de fecha y hora para registrar ventas históricas o fuera de línea.
- **Formas de Pago Avanzadas**:
  - `Efectivo`: Cálculo automático de cambio.
  - `Transferencia`: Registro de bancos y pasarelas (*Nequi*, *Daviplata*, *Bancolombia*, *Nu*, *Bre-B / Llave*, etc.) con soporte para **pagos divididos entre múltiples entidades**.
  - `Pago Mixto`: Combinación de efectivo y abonos digitales.
- Emisión e impresión de tickets/recibos oficiales con el logo y la identidad de Enchiladitos.

### 👥 2. Gestión de Clientes (CRM)
- Directorio de clientes con registro de nombres, apellidos, teléfono, correo y notas de preferencia.
- Búsqueda en tiempo real por nombre, teléfono o correo.
- Botón de **contacto directo por WhatsApp** con un solo clic.
- Historial acumulado de compras e inversión por cliente.

### 📦 3. Control de Inventario de Insumos & Recetas
- Control de existencias de materia prima (chamoy, tajín, gomitas, empaques, etc.) con alertas de stock mínimo.
- Descuento automático de insumos en inventario por cada venta realizada en el POS según la receta configurada.
- Registro inicial de insumos con opción de contabilización automática como gasto.

### ⚠️ 4. Reporte de Mermas y Pérdidas
- Módulo accesible para registrar mermas o daños accidentales de materia prima.
- Descuento automático del stock y cálculo de la pérdida financiera reflejada en contabilidad.

### 📜 5. Historial de Ventas & Cancelación Auditable
- Registro cronológico completo de ventas con filtro por periodos (hoy, semana, mes, año o rango de fechas).
- Función de **cancelación de ventas** (exclusiva del Dueño) con reversión automática de insumos al inventario y ajuste del balance contable.

### 💼 6. Contabilidad & Flujo de Caja (Exclusivo Dueño)
- Registro de gastos clasificados (Insumos, Servicios, Mantenimiento, Nómina, Otros).
- Registro de ingresos manuales extraordinarios.
- Balance neto en tiempo real calculando ventas (+), ingresos (+), egresos (-) y pérdidas por merma (-).

### 🏆 7. Estadísticas Ejecutivas & Reportes
- KPIs financieros del periodo: Total Facturado, Total Gastos y Ganancia Neta.
- Ranking del **Top 10 Productos Más Vendidos** y **Top 10 Clientes Frecuentes**.
- Métricas de rendimiento individual por cajero/vendedor.

---

## 🛡️ Matriz de Roles y Permisos

| Rol | POS & Ventas | Clientes | Inventario & Insumos | Historial Ventas | Contabilidad | Estadísticas | Usuarios |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 🌶️ **Empleado** | ✅ | ✅ | 👁️ Lectura | ✅ | ❌ | ❌ | ❌ |
| 🛡️ **Administrador** | ✅ | ✅ | ✅ Edición | ✅ | ❌ | ❌ | ❌ |
| 👑 **Dueño** | ✅ | ✅ | ✅ Edición | ✅ | ✅ | ✅ | ✅ |

---

## 🛠️ Arquitectura Tecnológica

- **Backend**: Go 1.22+, Router `Chi`, Driver PostgreSQL `pgx/v5`, Autenticación JWT, Server-Sent Events (SSE).
- **Frontend**: React 19, Vite, React Router v7, Tailwind CSS (Paleta Enchiladitos: Rojo Fuego, Chamoy, Tajín y Dorado), PWA instalable.
- **Base de Datos**: PostgreSQL 14+ (Compatible con Supabase).

---

## 💻 Instalación y Ejecución Local

### Prerrequisitos
- Go 1.22+
- Node.js 18+ y npm
- PostgreSQL corriendo localmente o URL de base de datos en Supabase

### 1. Backend en Go (`Backend/`)

1. Configura el archivo `Backend/.env`:
   ```env
   PORT=8080
   DB_URL=postgres://usuario:password@localhost:5432/enchiladitos?sslmode=disable
   JWT_SECRET=tu_clave_secreta_super_segura
   ```

2. Compila y ejecuta el servidor backend:
   ```bash
   cd Backend
   go run ./cmd/server
   ```
   *El servidor escuchará en `http://localhost:8080` (o el puerto definido en `PORT`).*

### 2. Frontend en React (`Frontend/`)

1. Instala las dependencias y corre el servidor de desarrollo:
   ```bash
   cd Frontend
   npm install
   npm run dev
   ```
   *El frontend abrirá en `http://localhost:5173`.*

2. Para generar el build de producción:
   ```bash
   npm run build
   ```

---

## 📄 Licencia

Desarrollado con ❤️ y mucho picante para **Enchiladitos**.
