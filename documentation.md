# 📚 Especificación Técnica y Funcional de Toffee Coffee

## 1. Visión General del Sistema

**Toffee Coffee** es una solución informática de gestión gastronómica integral desarrollada para optimizar los procesos operativos, financieros y de servicio en cafeterías. La plataforma integra en un solo ecosistema el **Punto de Venta (POS)**, **Monitor de Comandas en Tiempo Real (KDS)**, **Control de Inventario y Recetas**, **Registro de Mermas/Daños**, **Módulo de Contabilidad Financiera** y **Estadísticas Ejecutivas**.

---

## 2. Arquitectura del Sistema

El sistema utiliza una arquitectura cliente-servidor desacoplada con comunicación en tiempo real:

```
[ Frontend React / Vite ]  <--- HTTP REST API --->  [ Backend Go / Chi Router ]
         ^                                                  |
         |------------- Server-Sent Events (SSE) -----------|
                                                            |
                                                   [ PostgreSQL DB ]
```

### Componentes Principales:
1. **Backend (Go 1.26)**:
   - Framework de enrutamiento ultrarrápido con `go-chi/chi/v5`.
   - Conexión a base de datos de alto rendimiento con `jackc/pgx/v5`.
   - Autenticación mediante JSON Web Tokens (`JWT`) firmados con HMAC-SHA256.
   - Hub de eventos `SSE` (Server-Sent Events) para actualizaciones bidireccionales en vivo sin latencia.
2. **Frontend (React 19 / Vite)**:
   - Interfaz de usuario responsiva diseñada bajo el concepto estético **Espresso Roasted Design** (`#432414`, `#9F6839`, `#FEE4D7`).
   - Enrutamiento con `React Router v7` y estado global de autenticación vía `AuthContext`.
   - PWA instalable con soporte offline básico y patrones táctiles para tablets/pantallas POS.

---

## 3. Modelo de Datos y Entidades

### 3.1. Usuarios (`users`)
- `id` (UUID, PK)
- `username` (VARCHAR 100, UNIQUE)
- `password_hash` (TEXT)
- `role` (VARCHAR 20: `owner`, `admin`, `employee`)
- `avatar_url` (TEXT)
- `created_at` (TIMESTAMPTZ)

### 3.2. Productos y Recetas (`products`, `ingredients`, `product_ingredients`)
- `products`: Contiene el catálogo de ítems a la venta (cafés, postres, bebidas, etc.) con su precio, categoría y estado (`active`).
- `ingredients`: Insumos de materia prima (ej. grano de café en gramos, leche en mililitros, vasos en unidades).
- `product_ingredients`: Asocia cada producto con sus insumos y cantidad consumida por unidad vendida.

### 3.3. Ventas y Comandas (`sales`, `sale_items`, `comandas`, `comanda_items`)
- `sales`: Registro contable de cada transacción efectuada en caja (vendedor, cliente, monto total, fecha, método de pago, desglose de efectivo y transferencias por entidad).
- `comandas`: Ticket de preparación de baristas/cocineros asociado a la venta.
  - Estados: `pendiente` ➔ `en_preparacion` ➔ `listo` ➔ `entregado` / `cancelado`.
  - Atributos clave: `prepared_by` (UUID), `prepared_by_username` (TEXT), `ready_at` (TIMESTAMPTZ).

### 3.4. Contabilidad e Ingresos Manuales (`expenses`, `incomes`, `waste_reports`)
- `expenses`: Egresos por insumos, servicios, nómina, mantenimiento u otros gastos.
- `incomes`: Ingresos manuales extraordinarios (aportes de socios, eventos, ventas directas fuera de POS).
- `waste_reports`: Registro de pérdidas/mermas de insumos con deducción directa de inventario.

---

## 4. Módulos y Flujos Operativos

### 4.1. Punto de Venta (POS) & Cobro
1. El cajero/empleado selecciona productos del catálogo interactivo.
2. Define el tipo de servicio (*Para Llevar* o *Mesa*).
3. Selecciona la forma de pago:
   - **Efectivo**: Calcula el cambio a entregar.
   - **Transferencia**: Permite desglosar y asociar abonos a una o múltiples entidades (*Bancolombia*, *Nequi*, *Daviplata*, *Bre-B / Llave*, *Nu*, etc.).
   - **Pago Mixto**: Combina abono en efectivo + desglose de transferencias.
4. Al confirmar la venta:
   - Se descuenta automáticamente la materia prima del inventario según la receta.
   - Se crea el registro contable en `sales`.
   - Se genera el ticket en `comandas` con estado `pendiente` e identificador de preparador en `Por asignar`.
   - Se emite una alerta auditiva (campana) y notificación SSE en vivo a todas las pantallas de cocina.

### 4.2. Monitor de Comandas (KDS) & Asignación de Preparador
- Las comandas se organizan en 4 columnas: **Pendientes**, **En Preparación**, **Listas en Barra**, **Entregadas / Canceladas**.
- Al presionar **"Iniciar Preparación"**:
  - La comanda pasa a `en_preparacion`.
  - El sistema asigna incondicionalmente al usuario activo (`prepared_by` y `prepared_by_username`).
- Al presionar **"Cancelar Venta"** en una comanda pendiente:
  - El estado cambia a `cancelado`.
  - **Devolución de Insumos**: El backend repone automáticamente al stock de `ingredients` la cantidad exacta de insumos descontada.
  - La venta asociada se marca como `CANCELADA` y se excluye de las métricas de ingresos y facturación.

### 4.3. Historial de Ventas
- Muestra el registro cronológico con columna de **Estado**: `COMPLETADA` o `CANCELADA`.
- Permite ejecutar la **cancelación de venta** directamente desde la tabla de historial, manteniendo el registro auditable y recalculando los totales facturados.

### 4.4. Contabilidad & Balance Financiero (Exclusivo Dueño)
- Acceso restringido únicamente para el rol **Dueño (`owner`)**.
- Panel de KPIs con **Ingresos Totales**, **Gastos Registrados**, **Pérdidas por Mermas**, **Balance Neto Real** e **Ingresos por Método de Pago**.
- Modal **Registrar Ingreso Manual** y **Registrar Gasto** alineados en una sola línea horizontal con diseño responsive.
- Soporte en ingresos manuales para pagos en Efectivo, Transferencias desglosadas y Pagos Mixtos.

### 4.5. Control de Mermas / Daños
- Cualquier usuario puede declarar una merma seleccionando el insumo, la cantidad perdida, unidad y motivo.
- El sistema descuenta el stock de inmediato y refleja la pérdida financiera en el balance contable.

---

## 5. Control de Acceso y Seguridad (RBAC)

```
+---------------------------+----------+---------------+----------+
| Módulo / Funcionalidad    | Empleado | Administrador |  Dueño   |
+---------------------------+----------+---------------+----------+
| Ventas (POS) & Recibos    |    ✅    |       ✅      |    ✅    |
| Comandas (KDS Cocina)     |    ✅    |       ✅      |    ✅    |
| Reportar Mermas / Daños   |    ✅    |       ✅      |    ✅    |
| Ver Inventario / Stock    |    ✅    |       ✅      |    ✅    |
| Crear/Editar Productos    |    ❌    |       ✅      |    ✅    |
| Modificar Insumos Stock   |    ❌    |       ✅      |    ✅    |
| Contabilidad & Egresos    |    ❌    |       ❌      |    ✅    |
| Estadísticas Ejecutivas   |    ❌    |       ❌      |    ✅    |
| Gestión de Personal       |    ❌    |       ❌      |    ✅    |
+---------------------------+----------+---------------+----------+
```

---

## 6. Endpoints Principales de API REST

### Autenticación & Usuarios:
- `POST /login`: Inicio de sesión y generación de token JWT.
- `GET /users`: Obtener lista de usuarios (Requiere Auth).
- `POST /users`: Crear nuevo usuario (Exclusivo Owner).
- `PUT /users/{id}`: Actualizar usuario / cambiar rol (Exclusivo Owner).
- `PUT /users/me`: Actualizar perfil propio y avatar (Requiere Auth).

### Ventas & Comandas:
- `GET /sales`: Listar ventas filtradas por período o fecha.
- `POST /sales`: Crear nueva venta desde POS.
- `POST /sales/{id}/cancel`: Cancelar venta, revertir stock y actualizar comanda.
- `GET /comandas`: Listar comandas activas del día.
- `PATCH /comandas/{id}/status`: Actualizar estado de comanda y asignar preparador.

### Contabilidad & Gastos (Exclusivo Owner):
- `GET /accounting/summary`: Resumen de balance neto e indicadores KPI.
- `GET /expenses` / `POST /expenses`: Listar y registrar egresos operativos.
- `GET /incomes` / `POST /incomes`: Listar y registrar ingresos manuales.

---

## 7. Eventos en Tiempo Real (SSE)

El endpoint `GET /events` emite eventos JSON en vivo:
- `comanda_created`: Notifica nueva comanda creada desde caja.
- `comanda_updated`: Notifica cambio de estado o asignación de preparador.
- `inventory_updated`: Notifica deducciones o devoluciones de insumos.
- `expense_created` / `income_created`: Notifica actualizaciones contables.
