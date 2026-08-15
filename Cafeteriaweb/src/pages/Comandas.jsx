import { useEffect, useState, useCallback } from 'react'
import { api } from '../api/client'
import { useEvents } from '../hooks/useEvents'

export default function Comandas() {
  const [comandas, setComandas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadComandas() {
    try {
      const data = await api.get('/comandas')
      setComandas(data || [])
    } catch (err) {
      setError('No se pudieron cargar las comandas')
    } finally {
      setLoading(false)
    }
  }

  const handleComandaEvent = useCallback(() => {
    loadComandas()
  }, [])

  useEvents(['comanda_created', 'comanda_updated'], handleComandaEvent)

  useEffect(() => {
    loadComandas()
  }, [])

  async function handleStatusChange(comandaId, newStatus) {
    try {
      await api.patch(`/comandas/${comandaId}/status`, { status: newStatus })
      await loadComandas()
    } catch (err) {
      setError('No se pudo actualizar el estado de la comanda')
    }
  }

  if (loading) return <p>Cargando comandas en tiempo real...</p>

  const columns = [
    { key: 'pendiente', title: '⏳ Pendientes', color: '#fef08a' },
    { key: 'en_preparacion', title: '🍳 En Preparación', color: '#bfdbfe' },
    { key: 'listo', title: '🔔 Listo para Entregar', color: '#bbf7d0' },
    { key: 'entregado', title: '✅ Entregados', color: '#e7e5e4' }
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Sistema de Comandas (Cocina & Barra)</h2>
          <p className="page-subtitle">Pedidos en tiempo real generados automáticamente desde POS</p>
        </div>
      </div>

      {error && <p className="error-text" style={{ marginBottom: '1rem' }}>{error}</p>}

      <div className="comanda-board">
        {columns.map((col) => {
          const itemsInCol = comandas.filter((c) => c.status === col.key)
          return (
            <div key={col.key} className="comanda-column">
              <div className="column-header">
                <span>{col.title}</span>
                <span style={{ background: '#fff', padding: '0.1rem 0.5rem', borderRadius: '12px', fontSize: '0.85rem' }}>
                  {itemsInCol.length}
                </span>
              </div>

              {itemsInCol.map((c) => {
                const timeAgo = Math.max(0, Math.floor((new Date() - new Date(c.created_at)) / 60000))
                return (
                  <div key={c.id} className="comanda-card">
                    <div className="comanda-card-header">
                      <span className="order-number">#{c.order_number}</span>
                      <span className="comanda-time">hace {timeAgo} min</span>
                    </div>

                    <div className="customer-name">👤 {c.customer_name}</div>

                    <ul className="comanda-items-list">
                      {(c.items || []).map((item, idx) => (
                        <li key={idx} className="comanda-item-line">
                          <span>{item.product_name}</span>
                          <span style={{ fontWeight: 700 }}>x{item.quantity}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Botones de Acción de Estado */}
                    <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {c.status === 'pendiente' && (
                        <button onClick={() => handleStatusChange(c.id, 'en_preparacion')}>
                          ▶ Iniciar Preparación
                        </button>
                      )}
                      {c.status === 'en_preparacion' && (
                        <button className="success" onClick={() => handleStatusChange(c.id, 'listo')}>
                          ✔ Marcar Listo
                        </button>
                      )}
                      {c.status === 'listo' && (
                        <button onClick={() => handleStatusChange(c.id, 'entregado')}>
                          🤝 Entregar al Cliente
                        </button>
                      )}
                      {c.status !== 'entregado' && c.status !== 'cancelado' && (
                        <button className="danger" onClick={() => handleStatusChange(c.id, 'cancelado')} style={{ fontSize: '0.78rem', padding: '0.3rem' }}>
                          Cancelar Pedido
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}

              {itemsInCol.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2rem' }}>
                  Sin pedidos
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
