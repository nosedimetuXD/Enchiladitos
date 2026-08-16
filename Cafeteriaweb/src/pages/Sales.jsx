import { useEffect, useState, useMemo } from 'react'
import { api } from '../api/client'
import Modal from '../components/Modal'
import confetti from 'canvas-confetti'
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Coffee,
  ShoppingBag,
  Utensils,
  Bike,
  Heart,
  CheckCircle2,
  Image as ImageIcon
} from 'lucide-react'

const DEFAULT_PRODUCT_IMAGE = 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80'

export default function Sales() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Almacenamiento local de URLs de imagen por ID de producto
  const [productImages, setProductImages] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('toffe_product_images') || '{}')
    } catch (e) {
      return {}
    }
  })

  // Carrito de compras
  const [cartItems, setCartItems] = useState([])
  const [orderType, setOrderType] = useState('Para Llevar')
  const [tableNumber, setTableNumber] = useState('')
  const [tipAmount, setTipAmount] = useState(0)

  // Modal de cobro y cliente
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('efectivo')
  const [cashAmount, setCashAmount] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [pastCustomers, setPastCustomers] = useState([])

  // Modal Recibo impreso / exito
  const [lastOrder, setLastOrder] = useState(null)
  const [isReceiptOpen, setIsReceiptOpen] = useState(false)

  const isProductActive = (p) => typeof p.active !== 'undefined' ? p.active : (p.is_active ?? true)

  async function loadData() {
    try {
      const [prodData, salesData] = await Promise.all([
        api.get('/products'),
        api.get('/sales')
      ])
      setProducts(prodData || [])

      const cats = Array.from(new Set((prodData || []).map((p) => p.category))).filter(Boolean)
      setCategories(['Todos', ...cats])

      const uniqueCustomers = Array.from(
        new Set(
          (salesData || [])
            .map((s) => s.customer_name?.trim())
            .filter((name) => name && name !== 'Cliente General')
        )
      )
      setPastCustomers(uniqueCustomers)
    } catch (err) {
      setError('No se pudieron cargar los productos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Carrito helpers
  function addToCart(product, qtyToAdd = 1) {
    if (!isProductActive(product)) return
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + qtyToAdd }
            : item
        )
      }
      return [...prev, { product, quantity: qtyToAdd }]
    })
  }

  function updateQuantity(productId, delta) {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta
            return newQty > 0 ? { ...item, quantity: newQty } : null
          }
          return item
        })
        .filter(Boolean)
    )
  }

  function removeFromCart(productId) {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId))
  }

  function clearCart() {
    setCartItems([])
    setTableNumber('')
    setTipAmount(0)
  }

  // Cálculos de Totales
  const cartSubtotal = useMemo(
    () => cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0),
    [cartItems]
  )

  const cartTotal = useMemo(
    () => Math.max(0, cartSubtotal + tipAmount),
    [cartSubtotal, tipAmount]
  )

  // Mostrar solo productos activos en POS
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!isProductActive(p)) return false // Filtra productos inactivos
      const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [products, selectedCategory, searchQuery])

  function openCheckout() {
    if (cartItems.length === 0) return
    setCustomerName('')
    setPaymentMethod('efectivo')
    setCashAmount(String(cartTotal))
    setTransferAmount('0')
    setCheckoutError('')
    setIsCheckoutOpen(true)
  }

  async function handleConfirmSale(e) {
    e.preventDefault()
    setSubmitting(true)
    setCheckoutError('')

    const finalCustomer = customerName.trim() || 'Cliente General'
    let numCash = Number(cashAmount) || 0
    let numTransfer = Number(transferAmount) || 0

    if (paymentMethod === 'efectivo') {
      if (numCash < cartTotal) {
        setCheckoutError(`El efectivo entregado ($${numCash}) es menor al total ($${cartTotal})`)
        setSubmitting(false)
        return
      }
      numTransfer = 0
    } else if (paymentMethod === 'transferencia') {
      numCash = 0
      numTransfer = cartTotal
    } else if (paymentMethod === 'mixto') {
      if (numCash + numTransfer < cartTotal) {
        setCheckoutError(`La suma de efectivo + transferencia ($${numCash + numTransfer}) no cubre el total ($${cartTotal})`)
        setSubmitting(false)
        return
      }
    }

    try {
      const payload = {
        customer_name: orderType === 'Mesa' && tableNumber ? `${finalCustomer} (${tableNumber})` : finalCustomer,
        payment_method: paymentMethod,
        cash_amount: numCash,
        transfer_amount: numTransfer,
        items: cartItems.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.product.price
        }))
      }

      const resOrder = await api.post('/sales', payload)

      // Lanzar confeti de celebración
      try {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } })
      } catch (err) {}

      setLastOrder(resOrder || { customer_name: finalCustomer, total: cartTotal })
      setIsCheckoutOpen(false)
      setIsReceiptOpen(true)

      clearCart()
      await loadData()
    } catch (err) {
      setCheckoutError(err.message || 'No se pudo procesar la venta')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <p className="p-4 text-sm font-semibold text-[#9F6839]">Cargando catálogo POS...</p>

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-5rem)] lg:h-screen overflow-hidden">
      {/* Catálogo de Productos */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Barra de Búsqueda */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9F6839] dark:text-[#DABA8C]" />
            <input
              type="text"
              placeholder="Buscar café, bebidas, repostería..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-[#201009] border border-[#D4B28E] dark:border-[#9F6839]/40 focus:border-[#9F6839] rounded-full pl-11 pr-4 py-2.5 text-xs font-semibold text-[#432414] dark:text-[#FEE4D7] focus:outline-none shadow-xs"
            />
          </div>
        </div>

        {/* Categorías (Pills) */}
        <div className="mb-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#9F6839] text-white shadow-xs'
                      : 'bg-white dark:bg-[#201009] border border-[#D4B28E] dark:border-[#9F6839]/40 text-[#432414] dark:text-[#FEE4D7] hover:bg-[#FEE4D7]'
                  }`}
                >
                  {cat}
                </button>
              )
            })}
          </div>
        </div>

        {/* Grid de Tarjetas de Productos */}
        <div className="flex-1 overflow-y-auto pr-1 pb-6">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center text-[#9F6839]">
              <Coffee className="w-12 h-12 mb-3 stroke-[1.5]" />
              <p className="text-sm font-bold text-[#432414] dark:text-[#FEE4D7]">No hay productos activos disponibles</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredProducts.map((product) => {
                const inCart = cartItems.find((ci) => ci.product.id === product.id)
                const qty = inCart ? inCart.quantity : 0
                const img = productImages[product.id] || product.image_url || DEFAULT_PRODUCT_IMAGE

                return (
                  <div
                    key={product.id}
                    className="bg-white dark:bg-[#201009] border border-[#D4B28E]/70 dark:border-[#9F6839]/40 rounded-3xl overflow-hidden flex flex-col justify-between transition-all shadow-xs hover:border-[#9F6839]"
                  >
                    <div>
                      {/* Imagen de Producto Banner */}
                      <div className="relative h-32 w-full bg-[#FEE4D7]/50 dark:bg-[#2A150C] overflow-hidden">
                        <img
                          src={img}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                          onError={(e) => {
                            e.target.src = DEFAULT_PRODUCT_IMAGE
                          }}
                        />
                        <div className="absolute top-2.5 left-2.5">
                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#432414]/90 text-[#FEE4D7] backdrop-blur-xs shadow-xs">
                            {product.category || 'General'}
                          </span>
                        </div>
                        <div className="absolute top-2.5 right-2.5">
                          <span className="font-extrabold text-sm text-[#432414] bg-white/95 dark:bg-[#201009]/95 dark:text-[#FEE4D7] px-2.5 py-0.5 rounded-full shadow-xs border border-[#D4B28E]">
                            ${product.price.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="p-4">
                        <h3 className="font-extrabold text-base text-[#432414] dark:text-[#FEE4D7] leading-snug">
                          {product.name}
                        </h3>
                        {product.description && (
                          <p className="text-xs text-[#9F6839] dark:text-[#DABA8C]/80 line-clamp-2 mt-1 font-semibold">
                            {product.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="px-4 pb-4 pt-2 flex items-center justify-between border-t border-[#D4B28E]/30">
                      {qty > 0 ? (
                        <div className="flex items-center gap-2 bg-[#FEE4D7] dark:bg-[#34180D] border border-[#D4B28E] rounded-xl px-2 py-1">
                          <button
                            type="button"
                            onClick={() => updateQuantity(product.id, -1)}
                            className="w-6 h-6 rounded-lg text-[#432414] dark:text-[#FEE4D7] font-bold text-xs flex items-center justify-center cursor-pointer hover:bg-white dark:hover:bg-[#432414]"
                          >
                            -
                          </button>
                          <span className="text-xs font-extrabold text-[#432414] dark:text-[#FEE4D7] min-w-4 text-center">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(product.id, 1)}
                            className="w-6 h-6 rounded-lg text-[#432414] dark:text-[#FEE4D7] font-bold text-xs flex items-center justify-center cursor-pointer hover:bg-white dark:hover:bg-[#432414]"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] font-extrabold text-[#9F6839]">Listo para servir</span>
                      )}

                      <button
                        type="button"
                        onClick={() => addToCart(product, 1)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#9F6839] hover:bg-[#835229] text-white text-xs font-extrabold shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Agregar</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Panel Lateral de Carrito */}
      <aside className="w-full lg:w-96 bg-white dark:bg-[#201009] border border-[#D4B28E] dark:border-[#9F6839]/40 flex flex-col justify-between p-5 rounded-3xl shadow-sm shrink-0">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-[#D4B28E]/60 dark:border-[#9F6839]/30">
            <h2 className="text-base font-extrabold text-[#432414] dark:text-[#FEE4D7]">
              Resumen del Pedido
            </h2>
            {cartItems.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-xs text-[#9F6839] hover:text-red-600 flex items-center gap-1 cursor-pointer font-bold"
              >
                <Trash2 className="w-3.5 h-3.5" /> Vaciar
              </button>
            )}
          </div>

          {/* Tipo de Pedido */}
          <div className="grid grid-cols-3 gap-2 my-4">
            {[
              { id: 'Para Llevar', label: 'Llevar', icon: ShoppingBag },
              { id: 'Mesa', label: 'Mesa', icon: Utensils },
              { id: 'Barra', label: 'Barra', icon: Coffee }
            ].map((type) => {
              const Icon = type.icon
              const isSelected = orderType === type.id
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setOrderType(type.id)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#9F6839] text-white border-[#9F6839] shadow-xs'
                      : 'bg-white dark:bg-[#150904] border-[#D4B28E] text-[#432414] dark:text-[#FEE4D7]'
                  }`}
                >
                  <Icon className="w-4 h-4 mb-1" />
                  <span>{type.label}</span>
                </button>
              )
            })}
          </div>

          {orderType === 'Mesa' && (
            <div className="mb-4">
              <input
                type="text"
                placeholder="Número o Ubicación de Mesa (Ej. Mesa 4)..."
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="w-full px-3.5 py-2 rounded-2xl bg-white dark:bg-[#150904] border border-[#D4B28E] text-xs font-semibold text-[#432414] dark:text-[#FEE4D7]"
              />
            </div>
          )}

          {/* Ítems en Carrito */}
          <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1 my-2">
            {cartItems.length === 0 ? (
              <div className="text-center py-12 text-[#9F6839]">
                <Coffee className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-bold text-[#432414] dark:text-[#FEE4D7]">El carrito está vacío</p>
                <p className="text-[11px] text-[#9F6839] mt-0.5 font-semibold">Selecciona productos para comenzar el pedido</p>
              </div>
            ) : (
              cartItems.map((item) => {
                const itemImg = productImages[item.product.id] || item.product.image_url || DEFAULT_PRODUCT_IMAGE
                return (
                  <div
                    key={item.product.id}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-[#FEE4D7]/30 dark:bg-[#2A150C] border border-[#D4B28E]/60 text-xs gap-2.5"
                  >
                    <img
                      src={itemImg}
                      alt={item.product.name}
                      className="w-10 h-10 rounded-xl object-cover shrink-0 border border-[#D4B28E]/60"
                      onError={(e) => {
                        e.target.src = DEFAULT_PRODUCT_IMAGE
                      }}
                    />
                    <div className="flex-1 min-w-0 pr-1">
                      <span className="font-bold text-[#432414] dark:text-[#FEE4D7] block truncate">
                        {item.product.name}
                      </span>
                      <span className="text-[11px] font-semibold text-[#9F6839] dark:text-[#DABA8C]">
                        ${item.product.price.toLocaleString()} x {item.quantity}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-extrabold text-[#432414] dark:text-[#FEE4D7]">
                        ${(item.product.price * item.quantity).toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Totales y Botón de Cobro */}
        <div className="pt-4 border-t border-[#D4B28E]/60 dark:border-[#9F6839]/30 space-y-3">
          <div className="space-y-1.5 text-xs text-[#9F6839] font-semibold">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-bold text-[#432414] dark:text-[#FEE4D7]">${cartSubtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm font-extrabold text-[#432414] dark:text-[#FEE4D7] pt-2 border-t border-[#D4B28E]/40">
              <span>Total a Pagar:</span>
              <span className="text-lg text-emerald-600">${cartTotal.toLocaleString()}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={openCheckout}
            disabled={cartItems.length === 0}
            className="w-full py-3.5 rounded-2xl bg-[#9F6839] hover:bg-[#835229] text-white font-extrabold text-sm shadow-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Proceder al Cobro (${cartTotal.toLocaleString()})
          </button>
        </div>
      </aside>

      {/* Modal de Cobro */}
      <Modal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} title="Finalizar Venta en Caja">
        <form onSubmit={handleConfirmSale} className="space-y-4">
          {checkoutError && (
            <div className="p-3.5 rounded-2xl bg-red-50 text-red-700 border border-red-200 text-xs font-bold">
              ⚠️ {checkoutError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#432414] dark:text-[#DABA8C] uppercase tracking-wider mb-1">
              Nombre del Cliente (Opcional)
            </label>
            <input
              type="text"
              list="customer-autocomplete"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Ej. Mateo, Camilo, Cliente General"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#150904] border border-[#D4B28E] text-sm font-semibold text-[#432414] dark:text-[#FEE4D7]"
            />
            <datalist id="customer-autocomplete">
              {pastCustomers.map((cust, idx) => (
                <option key={idx} value={cust} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#432414] dark:text-[#DABA8C] uppercase tracking-wider mb-1">
              Método de Pago
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'efectivo', label: '💵 Efectivo' },
                { id: 'transferencia', label: '📱 Transferencia' },
                { id: 'mixto', label: '💳 Pago Mixto' }
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(m.id)
                    if (m.id === 'efectivo') setCashAmount(String(cartTotal))
                  }}
                  className={`py-2.5 px-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                    paymentMethod === m.id
                      ? 'bg-[#9F6839] text-white border-[#9F6839]'
                      : 'bg-white dark:bg-[#150904] border-[#D4B28E] text-[#432414] dark:text-[#FEE4D7]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {paymentMethod === 'efectivo' && (
            <div>
              <label className="block text-xs font-bold text-[#432414] dark:text-[#DABA8C] uppercase tracking-wider mb-1">
                Efectivo Recibido ($)
              </label>
              <input
                type="number"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                placeholder="Monto en dinero entregado..."
                required
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#150904] border border-[#D4B28E] text-sm font-semibold text-[#432414] dark:text-[#FEE4D7]"
              />
              {Number(cashAmount) >= cartTotal && (
                <p className="mt-1 text-xs text-emerald-600 font-extrabold">
                  Cambio a Entregar: ${(Number(cashAmount) - cartTotal).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {paymentMethod === 'mixto' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#432414] dark:text-[#DABA8C] uppercase tracking-wider mb-1">
                  Abono Efectivo ($)
                </label>
                <input
                  type="number"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  placeholder="0"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#150904] border border-[#D4B28E] text-sm font-semibold text-[#432414] dark:text-[#FEE4D7]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#432414] dark:text-[#DABA8C] uppercase tracking-wider mb-1">
                  Abono Transferencia ($)
                </label>
                <input
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="0"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#150904] border border-[#D4B28E] text-sm font-semibold text-[#432414] dark:text-[#FEE4D7]"
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-3">
            <button
              type="button"
              onClick={() => setIsCheckoutOpen(false)}
              className="px-4 py-2.5 rounded-2xl bg-white dark:bg-[#201009] border border-[#D4B28E] text-xs font-bold text-[#432414] dark:text-[#FEE4D7] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Procesando...' : 'Confirmar Venta'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Ticket Venta Impreso */}
      <Modal isOpen={isReceiptOpen} onClose={() => setIsReceiptOpen(false)} title="Venta Realizada con Éxito 🎉">
        {lastOrder && (
          <div className="space-y-4">
            <div id="printable-receipt" className="p-6 bg-white border border-gray-200 rounded-2xl text-center space-y-3 font-mono text-xs text-gray-800">
              <div className="border-b pb-3 flex flex-col items-center">
                <img src="/icon-192.png" alt="Toffe Logo" className="w-8 h-8 rounded-xl object-cover border border-[#9F6839] mb-1" />
                <h2 className="text-base font-extrabold text-[#432414] tracking-tight">TOFFE COFFEE</h2>
                <p className="text-[10px] text-gray-500">"Hecho por y para estudiantes"</p>
                <p className="text-[10px] text-gray-500 mt-1">Comprobante de Venta</p>
                <p className="text-[10px] text-gray-500">{new Date().toLocaleString()}</p>
              </div>

              <div className="text-left space-y-1 text-xs">
                <div><strong>Cliente:</strong> {lastOrder.customer_name}</div>
                <div><strong>Estado:</strong> Venta Registrada & Comanda Creada</div>
              </div>

              <div className="flex justify-between text-sm font-extrabold pt-2 border-t">
                <span>TOTAL FACTURADO:</span>
                <span>${(lastOrder.total || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsReceiptOpen(false)}
                className="px-5 py-2.5 rounded-2xl bg-[#9F6839] text-white text-xs font-extrabold shadow-md cursor-pointer"
              >
                Aceptar & Siguiente Venta
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}