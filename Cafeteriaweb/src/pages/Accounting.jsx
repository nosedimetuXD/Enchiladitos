import { useEffect, useState } from 'react'
import { api } from '../api/client'
import Modal from '../components/Modal'

export default function Accounting() {
  const [summary, setSummary] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [sales, setSales] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [period, setPeriod] = useState('month')
  const [activeTab, setActiveTab] = useState('sales') // 'sales' | 'expenses' | 'all'
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')

  // Modal para registrar gastos
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('insumos')
  const [paymentMethod, setPaymentMethod] = useState('efectivo')
  const [ingredientId, setIngredientId] = useState('')
  const [quantityAdded, setQuantityAdded] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  async function loadData() {
    try {
      const [sumData, expData, ingData, salesData] = await Promise.all([
        api.get(`/accounting/summary?period=${period}`),
        api.get('/expenses'),
        api.get('/ingredients'),
        api.get('/sales')
      ])
      setSummary(sumData)
      setExpenses(expData || [])
      setIngredients(ingData || [])
      setSales(salesData || [])
    } catch (err) {
      setPageError('No se pudo cargar la información de contabilidad')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [period])

  function openCreateModal() {
    setDescription('')
    setAmount('')
    setCategory('insumos')
    setPaymentMethod('efectivo')
    setIngredientId('')
    setQuantityAdded('')
    setFormError('')
    setIsModalOpen(true)
  }

  async function handleCreateExpense(e) {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')

    try {
      await api.post('/expenses', {
        description,
        amount: Number(amount),
        category,
        payment_method: paymentMethod,
        ingredient_id: category === 'insumos' && ingredientId ? ingredientId : null,
        quantity_added: category === 'insumos' && quantityAdded ? Number(quantityAdded) : 0
      })

      setIsModalOpen(false)
      await loadData()
    } catch (err) {
      setFormError(err.message || 'No se pudo registrar el gasto')
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

  const paymentBadges = {
    efectivo: { label: '💵 Efectivo', style: { background: '#dcfce7', color: '#166534' } },
    transferencia: { label: '📱 Transferencia', style: { background: '#e0e7ff', color: '#3730a3' } },
    mixto: { label: '💳 Mixto', style: { background: '#fef3c7', color: '#92400e' } }
  }

  if (loading) return <p>Cargando reporte de contabilidad...</p>

  // Movimientos combinados en orden cronológico
  const combinedMovements = [
    ...sales.map((s) => ({
      id: s.id,
      type: 'income',
      date: s.created_at,
      concept: `Venta - ${s.customer_name || 'Cliente General'}`,
      details: s.sold_by_username ? `Vendido por ${s.sold_by_username}` : 'Venta POS',
      paymentMethod: s.payment_method,
      amount: s.total
    })),
    ...expenses.map((e) => ({
      id: e.id,
      type: 'expense',
      date: e.created_at,
      concept: e.description,
      details: e.registerer_name ? `Registrado por ${e.registerer_name}` : 'Gasto operativo',
      paymentMethod: e.payment_method,
      amount: e.amount
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date))

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Sistema de Contabilidad & Gastos</h2>
          <p className="page-subtitle">Control financiero completo de ingresos por ventas y registro de egresos</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} style={{ width: 160 }}>
            <option value="today">📅 Hoy</option>
            <option value="week">📅 Esta Semana</option>
            <option value="month">📅 Este Mes</option>
            <option value="all">📅 Histórico Total</option>
          </select>
          <button onClick={openCreateModal}>
            + Registrar Gasto
          </button>
        </div>
      </div>

      {pageError && <p className="error-text" style={{ marginBottom: '1rem' }}>{pageError}</p>}

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

      {/* Selector de Pestañas (Ingresos / Gastos / Flujo de Caja) */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
        <button
          type="button"
          className={activeTab === 'sales' ? '' : 'secondary'}
          onClick={() => setActiveTab('sales')}
          style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
        >
          🟢 Ingresos (Ventas)
        </button>
        <button
          type="button"
          className={activeTab === 'expenses' ? '' : 'secondary'}
          onClick={() => setActiveTab('expenses')}
          style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
        >
          🔴 Gastos (Egresos)
        </button>
        <button
          type="button"
          className={activeTab === 'all' ? '' : 'secondary'}
          onClick={() => setActiveTab('all')}
          style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
        >
          📋 Flujo de Caja Combinado
        </button>
      </div>

      {/* Pestaña 1: Ingresos por Ventas */}
      {activeTab === 'sales' && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Fecha / Hora</th>
                <th>Cliente</th>
                <th>Método de Pago</th>
                <th>Vendido Por</th>
                <th>Monto Ingresado</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => {
                const pBadge = paymentBadges[s.payment_method] || paymentBadges.efectivo
                return (
                  <tr key={s.id}>
                    <td>{new Date(s.created_at).toLocaleString()}</td>
                    <td style={{ fontWeight: 600 }}>{s.customer_name || 'Cliente General'}</td>
                    <td>
                      <span style={{ ...pBadge.style, padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 700 }}>
                        {pBadge.label}
                      </span>
                    </td>
                    <td>{s.sold_by_username || 'Vendedor'}</td>
                    <td style={{ fontWeight: 800, color: 'var(--success)' }}>
                      +${s.total.toLocaleString()}
                    </td>
                  </tr>
                )
              })}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No hay ingresos registrados en este periodo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pestaña 2: Gastos Registrados */}
      {activeTab === 'expenses' && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Descripción</th>
                <th>Categoría</th>
                <th>Forma Pago</th>
                <th>Insumo Asociado</th>
                <th>Monto Erogado</th>
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
                    No hay gastos registrados en este periodo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pestaña 3: Flujo de Caja Combinado */}
      {activeTab === 'all' && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Fecha / Hora</th>
                <th>Tipo</th>
                <th>Concepto / Cliente</th>
                <th>Detalles</th>
                <th>Forma Pago</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              {combinedMovements.map((m) => {
                const pBadge = paymentBadges[m.paymentMethod] || paymentBadges.efectivo
                return (
                  <tr key={m.id} style={{ background: m.type === 'income' ? '#f0fdf4' : '#fef2f2' }}>
                    <td>{new Date(m.date).toLocaleString()}</td>
                    <td>
                      {m.type === 'income' ? (
                        <span className="badge-status status-listo">🟢 Ingreso</span>
                      ) : (
                        <span className="badge-status status-cancelado">🔴 Gasto</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>{m.concept}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{m.details}</td>
                    <td>
                      <span style={{ ...pBadge.style, padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 700 }}>
                        {pBadge.label}
                      </span>
                    </td>
                    <td style={{ fontWeight: 800, color: m.type === 'income' ? 'var(--success)' : 'var(--danger)' }}>
                      {m.type === 'income' ? `+$${m.amount.toLocaleString()}` : `-$${m.amount.toLocaleString()}`}
                    </td>
                  </tr>
                )
              })}
              {combinedMovements.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No hay movimientos contables registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Registrar Nuevo Gasto */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Nuevo Gasto / Compra">
        <form onSubmit={handleCreateExpense}>
          {formError && (
            <div style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1.25rem', fontWeight: 500 }}>
              ⚠️ {formError}
            </div>
          )}

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
