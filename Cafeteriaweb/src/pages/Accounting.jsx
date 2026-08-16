import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'

export default function Accounting() {
  const { user } = useAuth()
  const isOwner = user?.role === 'owner'

  const [summary, setSummary] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [period, setPeriod] = useState('month')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal para registrar gastos
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('insumos')
  const [paymentMethod, setPaymentMethod] = useState('efectivo')
  const [ingredientId, setIngredientId] = useState('')
  const [quantityAdded, setQuantityAdded] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function loadData() {
    try {
      const [sumData, expData, ingData] = await Promise.all([
        api.get(`/accounting/summary?period=${period}`),
        api.get('/expenses'),
        api.get('/ingredients')
      ])
      setSummary(sumData)
      setExpenses(expData || [])
      setIngredients(ingData || [])
    } catch (err) {
      setError('No se pudo cargar la información de contabilidad')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [period])

  async function handleCreateExpense(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      await api.post('/expenses', {
        description,
        amount: Number(amount),
        category,
        payment_method: paymentMethod,
        ingredient_id: category === 'insumos' && ingredientId ? ingredientId : null,
        quantity_added: category === 'insumos' && quantityAdded ? Number(quantityAdded) : 0
      })

      setDescription('')
      setAmount('')
      setCategory('insumos')
      setPaymentMethod('efectivo')
      setIngredientId('')
      setQuantityAdded('')
      setIsModalOpen(false)
      await loadData()
    } catch (err) {
      setError(err.message || 'No se pudo registrar el gasto')
    } finally {
      setSubmitting(false)
    }
  }

  const categoryBadges = {
    insumos: { label: '📦 Insumos', style: { background: '#fef3c7', color: '#92400e' } },
    servicios: { label: '💡 Servicios', style: { background: '#e0e7ff', color: '#3730a3' } },
    mantenimiento: { label: '🛠️ Mantenimiento', style: { background: '#fee2e2', color: '#991b1b' } },
    nomina: { label: '👤 Nómina', style: { background: '#dcfce7', color: '#166534' } },
    otros: { label: '📑 Otros', style: { background: '#f5f5f4', color: '#57534e' } }
  }

  if (loading) return <p>Cargando reporte de contabilidad...</p>

  const mStats = summary?.monthly_stats

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Sistema de Contabilidad & Gastos</h2>
          <p className="page-subtitle">Control financiero de ingresos por ventas y registro de egresos</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} style={{ width: 160 }}>
            <option value="today">📅 Hoy</option>
            <option value="week">📅 Esta Semana</option>
            <option value="month">📅 Este Mes</option>
            <option value="all">📅 Histórico Total</option>
          </select>
          <button onClick={() => setIsModalOpen(true)}>
            + Registrar Gasto
          </button>
        </div>
      </div>

      {error && <p className="error-text" style={{ marginBottom: '1rem' }}>{error}</p>}

      {/* Sección Exclusiva de Estadísticas del Mes (Solo Dueño) */}
      {isOwner && mStats && (
        <div style={{ background: '#1c1917', borderRadius: '16px', padding: '1.75rem', marginBottom: '2.25rem', color: '#fff', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid #292524', paddingBottom: '0.85rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>👑</span> Reporte Ejecutivo & Estadísticas del Mes (Exclusivo Dueño)
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#a8a29e', marginTop: '2px' }}>Resumen del rendimiento comercial y ranking mensual</p>
            </div>
            <span style={{ background: '#581c87', color: '#f3e8ff', padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
              SOLO DUEÑO
            </span>
          </div>

          <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
            <div style={{ background: '#292524', padding: '1.1rem', borderRadius: '12px', border: '1px solid #44403c' }}>
              <span style={{ fontSize: '0.78rem', color: '#a8a29e', textTransform: 'uppercase', fontWeight: 700 }}>Ventas Totales del Mes</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981', marginTop: '0.2rem' }}>
                ${mStats.monthly_income.toLocaleString()}
              </div>
            </div>

            <div style={{ background: '#292524', padding: '1.1rem', borderRadius: '12px', border: '1px solid #44403c' }}>
              <span style={{ fontSize: '0.78rem', color: '#a8a29e', textTransform: 'uppercase', fontWeight: 700 }}>Gastos Totales del Mes</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ef4444', marginTop: '0.2rem' }}>
                ${mStats.monthly_expenses.toLocaleString()}
              </div>
            </div>

            <div style={{ background: '#292524', padding: '1.1rem', borderRadius: '12px', border: '1px solid #44403c' }}>
              <span style={{ fontSize: '0.78rem', color: '#a8a29e', textTransform: 'uppercase', fontWeight: 700 }}>Ganancia Neta del Mes</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: mStats.net_profit >= 0 ? '#10b981' : '#ef4444', marginTop: '0.2rem' }}>
                ${mStats.net_profit.toLocaleString()}
              </div>
            </div>

            <div style={{ background: '#292524', padding: '1.1rem', borderRadius: '12px', border: '1px solid #44403c' }}>
              <span style={{ fontSize: '0.78rem', color: '#a8a29e', textTransform: 'uppercase', fontWeight: 700 }}>🥇 Mejor Vendedor del Mes</span>
              {mStats.top_seller ? (
                <div style={{ marginTop: '0.3rem' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f59e0b' }}>
                    {mStats.top_seller.username} <span style={{ fontSize: '0.72rem', background: '#44403c', padding: '2px 6px', borderRadius: '4px', color: '#fff', fontWeight: 500 }}>({mStats.top_seller.role})</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#d6d3d1' }}>
                    Vendió <strong>${mStats.top_seller.total_amount.toLocaleString()}</strong> ({mStats.top_seller.sales_count} ventas)
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '0.85rem', color: '#a8a29e', marginTop: '0.4rem' }}>Sin ventas este mes</div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Producto Más Vendido */}
            <div style={{ background: '#292524', padding: '1.25rem', borderRadius: '12px', border: '1px solid #44403c' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f59e0b', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>🔥</span> Producto Más Vendido del Mes
              </h4>
              {mStats.top_product ? (
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{mStats.top_product.product_name}</div>
                  <div style={{ fontSize: '0.85rem', color: '#a8a29e', marginTop: '0.2rem' }}>
                    Cantidad Vendida: <strong style={{ color: '#fff' }}>{mStats.top_product.total_qty} unidades</strong>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#a8a29e' }}>
                    Ingreso Generado: <strong style={{ color: '#10b981' }}>${mStats.top_product.total_amount.toLocaleString()}</strong>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: '0.85rem', color: '#a8a29e' }}>Sin datos disponibles</p>
              )}
            </div>

            {/* Top 5 Clientes */}
            <div style={{ background: '#292524', padding: '1.25rem', borderRadius: '12px', border: '1px solid #44403c' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f59e0b', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>🏆</span> Top 5 Clientes que Más Compraron
              </h4>
              {mStats.top_customers && mStats.top_customers.length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {mStats.top_customers.map((c, idx) => (
                    <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', paddingBottom: '0.35rem', borderBottom: '1px solid #383532' }}>
                      <span>
                        <strong style={{ color: '#f59e0b', marginRight: '0.4rem' }}>#{idx + 1}</strong>
                        {c.customer_name}
                      </span>
                      <span style={{ fontWeight: 700, color: '#10b981' }}>
                        ${c.total_spent.toLocaleString()} <span style={{ fontSize: '0.72rem', color: '#a8a29e', fontWeight: 400 }}>({c.orders_count} ord)</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ fontSize: '0.85rem', color: '#a8a29e' }}>Sin clientes registrados este mes</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tarjetas KPI Financieras */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-title">Ingresos Totales</span>
          <span className="kpi-value income">${(summary?.total_income || 0).toLocaleString()}</span>
          <span className="kpi-sub">Ventas realizadas ({summary?.sales_count || 0})</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-title">Gastos Totales</span>
          <span className="kpi-value expense">${(summary?.total_expenses || 0).toLocaleString()}</span>
          <span className="kpi-sub">Egresos registrados ({summary?.expenses_count || 0})</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-title">Balance Neto (Ganancia)</span>
          <span className={`kpi-value ${(summary?.net_balance || 0) >= 0 ? 'income' : 'expense'}`}>
            ${(summary?.net_balance || 0).toLocaleString()}
          </span>
          <span className="kpi-sub">Ingresos - Gastos</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-title">Ingresos por Método</span>
          <div style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
            <div>💵 Efectivo: <strong>${(summary?.income_by_payment_method?.efectivo || 0).toLocaleString()}</strong></div>
            <div>📱 Transferencia: <strong>${(summary?.income_by_payment_method?.transferencia || 0).toLocaleString()}</strong></div>
          </div>
        </div>
      </div>

      {/* Tabla de Historial de Gastos */}
      <h3 style={{ marginBottom: '1rem' }}>Historial de Gastos Registrados</h3>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Descripción</th>
              <th>Categoría</th>
              <th>Forma Pago</th>
              <th>Insumo Asociado</th>
              <th>Monto</th>
              <th>Registrado Por</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((exp) => {
              const catBadge = categoryBadges[exp.category] || categoryBadges.otros
              return (
                <tr key={exp.id}>
                  <td>{new Date(exp.created_at).toLocaleDateString()}</td>
                  <td style={{ fontWeight: 600 }}>{exp.description}</td>
                  <td>
                    <span style={{ ...catBadge.style, padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 700 }}>
                      {catBadge.label}
                    </span>
                  </td>
                  <td>{exp.payment_method === 'efectivo' ? '💵 Efectivo' : '📱 Transferencia'}</td>
                  <td>
                    {exp.ingredient_name ? (
                      <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                        + {exp.quantity_added} unidades de {exp.ingredient_name}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td style={{ fontWeight: 800, color: 'var(--danger)' }}>
                    -${exp.amount.toLocaleString()}
                  </td>
                  <td>{exp.registerer_name || 'Vendedor'}</td>
                </tr>
              )
            })}
            {expenses.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  No hay gastos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Registrar Nuevo Gasto */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Nuevo Gasto / Compra">
        <form onSubmit={handleCreateExpense}>
          <div className="form-group">
            <label>Descripción del Gasto / Compra</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Compra de 5kg Café en Grano / Servicio de Luz"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Monto ($)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="form-group">
              <label>Forma de Pago</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="efectivo">💵 Efectivo</option>
                <option value="transferencia">📱 Transferencia</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Categoría</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="insumos">📦 Insumos / Materia Prima</option>
              <option value="servicios">💡 Servicios Básicos</option>
              <option value="mantenimiento">🛠️ Mantenimiento & Equipos</option>
              <option value="nomina">👤 Nómina & Empleados</option>
              <option value="otros">📑 Otros Gastos</option>
            </select>
          </div>

          {category === 'insumos' && (
            <div style={{ background: '#fffbeb', padding: '1rem', border: '1px solid #fef3c7', borderRadius: '8px', marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#92400e', marginBottom: '0.75rem' }}>
                📦 Reabastecer Stock en Inventario (Opcional)
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Seleccionar Insumo</label>
                  <select value={ingredientId} onChange={(e) => setIngredientId(e.target.value)}>
                    <option value="">No sumar a inventario</option>
                    {ingredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} (Stock actual: {ing.quantity} {ing.unit})
                      </option>
                    ))}
                  </select>
                </div>
                {ingredientId && (
                  <div className="form-group">
                    <label>Cantidad a Sumar</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={quantityAdded}
                      onChange={(e) => setQuantityAdded(e.target.value)}
                      placeholder="Ej. 5.0"
                      required
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button type="button" className="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Guardando...' : 'Registrar Gasto'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
