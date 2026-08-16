import { useEffect, useState } from 'react'
import { api } from '../api/client'
import Modal from '../components/Modal'

export default function Sales() {
  const [products, setProducts] = useState([])
  const [pastCustomers, setPastCustomers] = useState([])
  const [cart, setCart] = useState({}) // { productId: quantity }
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Estado del Modal Checkout
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [customerName, setCustomerName] = useState('Cliente General')
  const [paymentMethod, setPaymentMethod] = useState('efectivo')
  const [cashAmount, setCashAmount] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  async function loadData() {
    try {
      const [productsData, salesData] = await Promise.all([
        api.get('/products'),
        api.get('/sales')
      ])
      setProducts((productsData || []).filter((p) => p.active))

      if (salesData && Array.isArray(salesData)) {
        const uniqueNames = Array.from(
          new Set(
            salesData
              .map((s) => s.customer_name?.trim())
              .filter((name) => name && name.toLowerCase() !== 'cliente general')
          )
        )
        setPastCustomers(uniqueNames)
      }
    } catch (err) {
      setError('No se pudieron cargar los productos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function addToCart(productId) {
    setCart((prev) => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1
    }))
  }

  function updateQuantity(productId, delta) {
    setCart((prev) => {
      const current = prev[productId] || 0
      const next = current + delta
      const updated = { ...prev }
      if (next <= 0) {
        delete updated[productId]
      } else {
        updated[productId] = next
      }
      return updated
    })
  }

  const cartItems = Object.entries(cart)
    .map(([productId, quantity]) => {
      const product = products.find((p) => p.id === productId)
      return { product, quantity }
    })
    .filter((item) => item.product)

  const total = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0)

  function openCheckout() {
    setCustomerName('Cliente General')
    setPaymentMethod('efectivo')
    setCashAmount(total.toString())
    setTransferAmount('0')
    setCheckoutError('')
    setIsModalOpen(true)
  }

  async function handleConfirmSale(e) {
    e.preventDefault()
    setSubmitting(true)
    setCheckoutError('')

    let cash = Number(cashAmount) || 0
    let transfer = Number(transferAmount) || 0

    if (paymentMethod === 'efectivo') {
      cash = total
      transfer = 0
    } else if (paymentMethod === 'transferencia') {
      cash = 0
      transfer = total
    } else if (paymentMethod === 'mixto') {
      if (cash + transfer < total) {
        setCheckoutError(`El monto total ingresado ($${(cash + transfer).toLocaleString()}) es menor al total ($${total.toLocaleString()})`)
        setSubmitting(false)
        return
      }
    }

    try {
      const res = await api.post('/sales', {
        customer_name: customerName,
        payment_method: paymentMethod,
        cash_amount: cash,
        transfer_amount: transfer,
        items: cartItems.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity
        }))
      })

      setCart({})
      setIsModalOpen(false)
      setSuccessMsg(`¡Venta #${res.order_number || ''} registrada con éxito! Comanda generada para ${customerName}.`)
      setTimeout(() => setSuccessMsg(''), 5000)
      loadData()
    } catch (err) {
      setCheckoutError(err.message.includes('inventario') ? 'No hay suficiente inventario disponible para completar este pedido.' : err.message || 'No se pudo completar la venta')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
  )

  if (loading) return <p>Cargando catálogo...</p>

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Punto de Venta (POS)</h2>
          <p className="page-subtitle">Selecciona los productos para registrar una nueva orden</p>
        </div>
      </div>

      {successMsg && (
        <div style={{ padding: '0.85rem 1.25rem', background: '#dcfce7', color: '#15803d', borderRadius: '8px', marginBottom: '1.25rem', fontWeight: 600 }}>
          {successMsg}
        </div>
      )}
      {error && <p className="error-text" style={{ marginBottom: '1rem' }}>{error}</p>}

      <div className="pos-layout">
        {/* Catálogo de Productos */}
        <div className="pos-catalog">
          <div className="search-bar">
            <input
              type="text"
              placeholder="🔍 Buscar producto por nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="pos-grid">
            {filteredProducts.map((p) => (
              <div key={p.id} className="product-item-card" onClick={() => addToCart(p.id)}>
                <div>
                  <div className="product-name">{p.name}</div>
                  <div className="product-desc">{p.description || 'Sin descripción'}</div>
                </div>
                <div className="product-footer">
                  <span className="product-price">${p.price.toLocaleString()}</span>
                  <span className="add-qty-btn">+ Agregar</span>
                </div>
              </div>
            ))}
            {filteredProducts.length === 0 && (
              <p style={{ color: 'var(--text-muted)', gridColumn: '1 / -1' }}>No se encontraron productos.</p>
            )}
          </div>
        </div>

        {/* Panel de Carrito */}
        <div className="pos-cart-panel">
          <h3 className="cart-title">
            <span>🛒</span> Carrito de Compra
          </h3>

          {cartItems.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', margin: '2rem 0' }}>
              El carrito está vacío
            </p>
          ) : (
            <div className="cart-items-list">
              {cartItems.map((item) => (
                <div key={item.product.id} className="cart-item-row">
                  <div>
                    <div style={{ fontWeight: 600 }}>{item.product.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      ${item.product.price.toLocaleString()} c/u
                    </div>
                  </div>
                  <div className="cart-item-controls">
                    <button type="button" className="qty-btn secondary" onClick={() => updateQuantity(item.product.id, -1)}>-</button>
                    <span style={{ fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                    <button type="button" className="qty-btn secondary" onClick={() => updateQuantity(item.product.id, 1)}>+</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="cart-total-block">
            <div className="cart-total-row">
              <span>Total</span>
              <span>${total.toLocaleString()}</span>
            </div>
          </div>

          <button
            onClick={openCheckout}
            disabled={cartItems.length === 0}
            style={{ width: '100%', padding: '0.85rem', fontSize: '1rem' }}
          >
            Proceder al Cobro (${total.toLocaleString()})
          </button>
        </div>
      </div>

      {/* Modal de Cobro y Nombre del Cliente */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Finalizar Venta & Cobro">
        <form onSubmit={handleConfirmSale}>
          {checkoutError && (
            <div style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1.25rem', fontWeight: 500 }}>
              ⚠️ {checkoutError}
            </div>
          )}

          <div className="form-group">
            <label>Nombre del Cliente</label>
            <input
              type="text"
              list="customer-suggestions"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Escribe o selecciona un cliente de compras anteriores..."
              required
            />
            <datalist id="customer-suggestions">
              <option value="Cliente General" />
              {pastCustomers.map((name, idx) => (
                <option key={idx} value={name} />
              ))}
            </datalist>
          </div>

          <div className="form-group">
            <label>Método de Pago</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="efectivo">💵 Efectivo</option>
              <option value="transferencia">📱 Transferencia bancaria</option>
              <option value="mixto">💳 Pago Mixto (Efectivo + Transferencia)</option>
            </select>
          </div>

          {paymentMethod === 'efectivo' && (
            <div className="form-group">
              <label>Monto recibido en efectivo ($)</label>
              <input
                type="number"
                step="0.01"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                min={total}
              />
              {Number(cashAmount) >= total && (
                <div style={{ marginTop: '0.4rem', fontSize: '0.9rem', color: 'var(--success)', fontWeight: 700 }}>
                  Cambio a entregar: ${(Number(cashAmount) - total).toLocaleString()}
                </div>
              )}
            </div>
          )}

          {paymentMethod === 'mixto' && (
            <div className="form-row">
              <div className="form-group">
                <label>Monto Efectivo ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Monto Transferencia ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                />
              </div>
            </div>
          )}

          <div style={{ background: '#f5f5f4', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem' }}>
              <span>Total a Pagar:</span>
              <span style={{ color: 'var(--primary)' }}>${total.toLocaleString()}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Procesando...' : 'Confirmar Venta & Comanda'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}