import { useEffect, useState } from 'react'
import { api } from '../api/client'
import Modal from '../components/Modal'

export default function SalesHistory() {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterMethod, setFilterMethod] = useState('todos')

  // Modal para ver detalles de una venta
  const [selectedSale, setSelectedSale] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  async function loadSales() {
    try {
      const data = await api.get('/sales')
      setSales(data || [])
    } catch (err) {
      setError('No se pudo cargar el historial de ventas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSales()
  }, [])

  async function handleViewDetail(saleId) {
    setIsModalOpen(true)
    setLoadingDetail(true)
    try {
      const detail = await api.get(`/sales/${saleId}`)
      setSelectedSale(detail)
    } catch (err) {
      setError('Error al obtener detalle de la venta')
    } finally {
      setLoadingDetail(false)
    }
  }

  const filteredSales = sales.filter((s) => {
    const matchesSearch =
      (s.customer_name && s.customer_name.toLowerCase().includes(search.toLowerCase())) ||
      (s.sold_by_username && s.sold_by_username.toLowerCase().includes(search.toLowerCase()))
    const matchesMethod = filterMethod === 'todos' || s.payment_method === filterMethod
    return matchesSearch && matchesMethod
  })

  const paymentBadges = {
    efectivo: { label: '💵 Efectivo', style: { background: '#dcfce7', color: '#166534' } },
    transferencia: { label: '📱 Transferencia', style: { background: '#dbeafe', color: '#1e40af' } },
    mixto: { label: '💳 Mixto', style: { background: '#fef3c7', color: '#92400e' } }
  }

  if (loading) return <p>Cargando registro de ventas...</p>

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Registro de Ventas</h2>
          <p className="page-subtitle">Historial detallado de todas las transacciones realizadas</p>
        </div>
      </div>

      {error && <p className="error-text" style={{ marginBottom: '1rem' }}>{error}</p>}

      {/* Filtros */}
      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <input
            type="text"
            placeholder="🔍 Buscar por cliente o vendedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ width: 220 }}>
          <select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)}>
            <option value="todos">Todos los métodos de pago</option>
            <option value="efectivo">💵 Efectivo</option>
            <option value="transferencia">📱 Transferencia</option>
            <option value="mixto">💳 Pago Mixto</option>
          </select>
        </div>
      </div>

      {/* Tabla de Historial */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Fecha y Hora</th>
              <th>Cliente</th>
              <th>Vendedor</th>
              <th>Método de Pago</th>
              <th>Total</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.map((s) => {
              const badge = paymentBadges[s.payment_method] || paymentBadges.efectivo
              return (
                <tr key={s.id}>
                  <td>{new Date(s.created_at).toLocaleString()}</td>
                  <td style={{ fontWeight: 600 }}>{s.customer_name || 'Cliente General'}</td>
                  <td>{s.sold_by_username || 'Atendido'}</td>
                  <td>
                    <span style={{ ...badge.style, padding: '0.25rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 }}>
                      {badge.label}
                    </span>
                  </td>
                  <td style={{ fontWeight: 800, color: 'var(--primary)' }}>
                    ${s.total.toLocaleString()}
                  </td>
                  <td>
                    <button className="secondary" onClick={() => handleViewDetail(s.id)}>
                      🔍 Ver detalle
                    </button>
                  </td>
                </tr>
              )
            })}
            {filteredSales.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  No hay registros de ventas que coincidan con los filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Detalle de Venta */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Detalle de la Venta">
        {loadingDetail || !selectedSale ? (
          <p>Cargando información del pedido...</p>
        ) : (
          <div>
            <div style={{ background: '#f5f5f4', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
              <div><strong>Cliente:</strong> {selectedSale.customer_name}</div>
              <div><strong>Atendido por:</strong> {selectedSale.sold_by_username || 'Sistema'}</div>
              <div><strong>Fecha:</strong> {new Date(selectedSale.created_at).toLocaleString()}</div>
              <div><strong>Forma de Pago:</strong> {selectedSale.payment_method.toUpperCase()}</div>
              {selectedSale.payment_method === 'mixto' && (
                <div style={{ gridColumn: '1 / -1', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Desglose: Efectivo (${selectedSale.cash_amount}) + Transferencia (${selectedSale.transfer_amount})
                </div>
              )}
            </div>

            <h4 style={{ marginBottom: '0.75rem' }}>Productos Comprados</h4>
            <div className="table-container" style={{ marginBottom: '1.25rem' }}>
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cant.</th>
                    <th>Precio U.</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedSale.items || []).map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{item.product_name || item.product_id}</td>
                      <td>x{item.quantity}</td>
                      <td>${item.unit_price.toLocaleString()}</td>
                      <td style={{ fontWeight: 700 }}>${(item.unit_price * item.quantity).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--primary-light)', padding: '1rem', borderRadius: '8px' }}>
              <span style={{ fontWeight: 700, color: 'var(--primary-text)' }}>Total de la Venta:</span>
              <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)' }}>${selectedSale.total.toLocaleString()}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
