import { useEffect, useState } from 'react'
import { api } from '../api/client'

export default function Stats() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadStats() {
    try {
      const data = await api.get('/accounting/summary?period=month')
      setSummary(data)
    } catch (err) {
      setError('No se pudieron cargar las estadísticas del mes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  if (loading) return <p>Cargando estadísticas ejecutivas...</p>

  const mStats = summary?.monthly_stats

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">📊 Estadísticas Ejecutivas del Mes</h2>
          <p className="page-subtitle">Reporte exclusivo de rendimiento comercial, ranking de ventas y clientes para el Dueño</p>
        </div>
      </div>

      {error && <p className="error-text" style={{ marginBottom: '1rem' }}>{error}</p>}

      {mStats ? (
        <div>
          {/* Tarjetas KPI Principales */}
          <div className="kpi-grid" style={{ marginBottom: '1.75rem' }}>
            <div className="kpi-card" style={{ background: '#ffffff', borderLeft: '4px solid #10b981' }}>
              <span className="kpi-title">Ventas Totales del Mes</span>
              <span className="kpi-value income">${mStats.monthly_income.toLocaleString()}</span>
              <span className="kpi-sub">Ingresos por transacciones de venta</span>
            </div>

            <div className="kpi-card" style={{ background: '#ffffff', borderLeft: '4px solid #ef4444' }}>
              <span className="kpi-title">Gastos Totales del Mes</span>
              <span className="kpi-value expense">${mStats.monthly_expenses.toLocaleString()}</span>
              <span className="kpi-sub">Egresos y compras de insumos</span>
            </div>

            <div className="kpi-card" style={{ background: '#ffffff', borderLeft: `4px solid ${mStats.net_profit >= 0 ? '#10b981' : '#ef4444'}` }}>
              <span className="kpi-title">Ganancia Neta del Mes</span>
              <span className={`kpi-value ${mStats.net_profit >= 0 ? 'income' : 'expense'}`}>
                ${mStats.net_profit.toLocaleString()}
              </span>
              <span className="kpi-sub">Ventas - Gastos</span>
            </div>

            <div className="kpi-card" style={{ background: '#ffffff', borderLeft: '4px solid #f59e0b' }}>
              <span className="kpi-title">🥇 Mejor Vendedor del Mes</span>
              {mStats.top_seller ? (
                <div style={{ marginTop: '0.25rem' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--primary)' }}>
                    {mStats.top_seller.username} <span style={{ fontSize: '0.75rem', background: '#f5f5f4', padding: '2px 8px', borderRadius: '4px', color: '#57534e' }}>({mStats.top_seller.role})</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Total vendido: <strong style={{ color: 'var(--success)' }}>${mStats.top_seller.total_amount.toLocaleString()}</strong> ({mStats.top_seller.sales_count} ventas)
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>Sin ventas este mes</div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {/* Tarjeta Producto Estrella */}
            <div className="card" style={{ background: '#ffffff', border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>🔥</span> Producto Más Vendido del Mes
              </h3>
              {mStats.top_product ? (
                <div style={{ background: '#fffbeb', padding: '1.25rem', borderRadius: '12px', border: '1px solid #fef3c7' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#92400e' }}>
                    {mStats.top_product.product_name}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', fontSize: '0.95rem' }}>
                    <span>Cantidad Vendida:</span>
                    <strong style={{ color: 'var(--primary)' }}>{mStats.top_product.total_qty} unidades</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem', fontSize: '0.95rem' }}>
                    <span>Ingresos Generados:</span>
                    <strong style={{ color: 'var(--success)' }}>${mStats.top_product.total_amount.toLocaleString()}</strong>
                  </div>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>No hay productos vendidos este mes.</p>
              )}
            </div>

            {/* Tarjeta Top 5 Clientes */}
            <div className="card" style={{ background: '#ffffff', border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>🏆</span> Top 5 Clientes que Más Compraron
              </h3>
              {mStats.top_customers && mStats.top_customers.length > 0 ? (
                <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Puesto</th>
                        <th>Cliente</th>
                        <th>Órdenes</th>
                        <th>Total Comprado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mStats.top_customers.map((c, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 800, color: 'var(--primary)' }}>#{idx + 1}</td>
                          <td style={{ fontWeight: 600 }}>{c.customer_name}</td>
                          <td>{c.orders_count} ord</td>
                          <td style={{ fontWeight: 800, color: 'var(--success)' }}>
                            ${c.total_spent.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>No hay clientes registrados este mes.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p style={{ color: 'var(--text-muted)' }}>No hay estadísticas disponibles.</p>
      )}
    </div>
  )
}
