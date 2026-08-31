# 🌶️ Enchiladitos - Sistema de Gestión & Punto de Venta (POS)

> *"Sabor, Chamoy y Fuego"*

**Enchiladitos** es una plataforma web moderna e integral de Punto de Venta (POS), control directo de inventario de productos empaquetados, gestión de clientes (CRM 360°), contabilidad financiera, registro de ventas pasadas, descuentos y estadísticas ejecutivas diseñada a la medida para la operación del dueño de Enchiladitos.

---

## 🚀 Características Principales

### 🛒 1. Punto de Venta (POS) & Cobro Rápido
- **Catálogo visual de productos** (Gomitas Escarchadas, Sparkies Enchilados, Combos, etc.) con búsqueda predictiva, filtros por categoría y visualización de existencias en tiempo real.
- **Carrito de compras interactivo** con cálculo instantáneo de subtotal, descuento aplicado y total.
- **Sistema de Descuentos**: Aplica descuentos porcentuales (%) o fijos ($) con motivo descriptivo para promociones y fidelidad.
- **Control de Descuento de Stock Opcional**: Interruptor configurable para ventas pasadas o regulares (activo por defecto).
- **Asociación y Registro Rápido de Clientes**: Búsqueda autocompletable o ingreso de clientes de mostrador.
- **Registro en Fechas Pasadas**: Selector de fecha y hora para cargar ventas históricas o fuera de línea.
- **Formas de Pago Avanzadas**:
  - `Efectivo`: Cálculo automático de cambio.
  - `Transferencia`: Registro de bancos y pasarelas (*Nequi*, *Daviplata*, *Bancolombia*, *Nu*, *Bre-B / Llave*, etc.) con soporte para **pagos divididos entre múltiples entidades**.
  - `Pago Mixto`: Combinación de efectivo y abonos digitales.
- **Recibo Oficial e Impresión**: Emisión e impresión de tickets detallados y botón para **enviar comprobante por WhatsApp** con un solo clic.

### 👥 2. Gestión de Clientes (CRM 360°)
- Directorio de clientes con nombres, teléfono, correo y notas de preferencias (*"le gusta con extra tajín"*).
- **Ficha 360° y Timeline**: Historial cronológico de compras acumuladas, pedidos realizados e inversión total por cliente.
- **Plantillas Rápidas de WhatsApp**: Envío de saludos, cupones de descuento y avisos de nuevos lotes de productos en un clic.
- **Exportación a CSV**: Descarga directa de la base de clientes para análisis externo.

### 📦 3. Control de Productos & Stock Directo
- Control de existencias directas por unidades para productos terminados y empaquetados.
- Semáforo de alerta de stock bajo y aviso de productos agotados.
- Modal de **Ajuste Rápido de Stock**: Reabastecimiento de producción o registro de mermas/daños accidentales.
- Etiquetas (Tags) para clasificación rápida (*Más vendido*, *Favorito*, *Temporada*).
- Cálculo del valor total del inventario en pesos.

### 📜 4. Historial de Ventas 100% Auditable y Editable
- Registro cronológico completo de ventas con filtros rápidos (Hoy, 7 días, Mes, Año, Todo) o rango de fechas.
- **Edición Completa de Ventas**: Modifica cliente, método de pago, desglose de bancos, fecha, descuentos y productos reajustando el stock automáticamente.
- **Eliminación de Ventas**: Cancela o borra ventas con reversión automática de unidades al inventario.
- **Exportación a Excel / CSV**: Descarga inmediata de todas las ventas del periodo.

### 💼 5. Contabilidad & Flujo de Caja
- **Gastos e Ingresos Editables**: Registra, modifica y elimina gastos e ingresos extraordinarios con soporte para fechas pasadas.
- Clasificación de egresos (*Materia prima*, *Empaques*, *Servicios*, *Arriendo*, *Nómina*, *Marketing*, *Otros*).
- Balance neto en tiempo real calculando ventas (+), ingresos extraordinarios (+) y egresos (-).
- **Exportación Contable a CSV**: Reportes financieros listos para contabilidad o declaraciones.

### 🏆 6. Estadísticas Ejecutivas del Negocio
- KPIs financieros clave: Total Facturado, Total Gastos, Utilidad Neta Real y Ticket Promedio por cliente.
- Ranking del **Top 10 Productos Más Vendidos** (unidades y dinero).
- Ranking del **Top 10 Clientes Frecuentes**.
- Distribución de ingresos por métodos de pago y bancos.

---

## 🛠️ Arquitectura Tecnológica

- **Backend**: Go (Golang 1.22+), Router `Chi`, Driver PostgreSQL `pgx/v5`, Autenticación JWT, Server-Sent Events (SSE).
- **Frontend**: React 19, Vite, React Router v7, Tailwind CSS (Paleta Enchiladitos: Rojo Fuego, Chamoy, Tajín y Dorado).
- **Base de Datos**: PostgreSQL 14+ (Compatible con Supabase).

---

## 💻 Instalación y Ejecución Local

### Prerrequisitos
- Go 1.22+
- Node.js 18+ y npm
- PostgreSQL o URL de base de datos en Supabase

### 1. Backend en Go (`Backend/`)
1. Configura el archivo `Backend/.env`:
   ```env
   PORT=8080
   DB_URL=postgres://usuario:password@localhost:5432/enchiladitos?sslmode=disable
   JWT_SECRET=tu_clave_secreta_super_segura
   ```
2. Ejecuta el servidor backend:
   ```bash
   cd Backend
   go run ./cmd/server
   ```

### 2. Frontend en React (`Frontend/`)
1. Instala dependencias y corre el entorno de desarrollo:
   ```bash
   cd Frontend
   npm install
   npm run dev
   ```

---

## 📄 Licencia

Desarrollado con ❤️ y mucho picante para **Enchiladitos**.
