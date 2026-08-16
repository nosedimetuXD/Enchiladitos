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
  GraduationCap,
  Heart,
  CheckCircle2
} from 'lucide-react'

export default function Sales() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Carrito de compras
  const [cartItems, setCartItems] = useState([])
  const [orderType, setOrderType] = useState('Para Llevar')
  const [tableNumber, setTableNumber] = useState('')
  const [studentDiscountApplied, setStudentDiscountApplied] = useState(false)
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
    if (!product.is_active) return
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
    setStudentDiscountApplied(false)
    setTipAmount(0)
  }

  // Cálculos de Totales
  const cartSubtotal = useMemo(
    () => cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0),
    [cartItems]
  )

  const cartDiscount = useMemo(
    () => (studentDiscountApplied ? Math.round(cartSubtotal * 0.1) : 0),
    [cartSubtotal, studentDiscountApplied]
  )

  const cartTotal = useMemo(
    () => Math.max(0, cartSubtotal - cartDiscount + tipAmount),
    [cartSubtotal, cartDiscount, tipAmount]
  )

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
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
              <p className="text-sm font-bold text-[#432414] dark:text-[#FEE4D7]">No hay productos disponibles</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredProducts.map((product) => {
                const inCart = cartItems.find((ci) => ci.product.id === product.id)
                const qty = inCart ? inCart.quantity : 0

                return (
                  <div
                    key={product.id}
                    className={`bg-white dark:bg-[#201009] border rounded-3xl p-4 flex flex-col justify-between transition-all shadow-xs ${
                      !product.is_active
                        ? 'opacity-50 border-gray-200'
                        : 'border-[#D4B28E]/70 dark:border-[#9F6839]/40 hover:border-[#9F6839]'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#FEE4D7] dark:bg-[#34180D] text-[#9F6839] dark:text-[#DABA8C] border border-[#D4B28E]/50">
                          {product.category || 'General'}
                        </span>
                        <span className="font-extrabold text-base text-[#432414] dark:text-[#FEE4D7]">
                          ${product.price.toLocaleString()}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-[#432414] dark:text-[#FEE4D7] leading-snug">
                        {product.name}
                      </h3>
                      {product.description && (
                        <p className="text-xs text-[#9F6839] dark:text-[#DABA8C]/80 line-clamp-2 mt-1">
                          {product.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 mt-3 flex items-center justify-between border-t border-[#D4B28E]/30">
                      {qty > 0 ? (
                        <div className="flex items-center gap-2 bg-[#FEE4D7] dark:bg-[#34180D] border border-[#D4B28E] rounded-xl px-2 py-1">
                          <button
                            onClick={() => updateQuantity(product.id, -1)}
                            className="w-6 h-6 rounded-lg text-[#432414] dark:text-[#FEE4D7] font-bold text-xs flex items-center justify-center cursor-pointer"
                          >
                            -
                          </button>
                          <span className="text-xs font-extrabold text-[#432414] dark:text-[#FEE4D7] min-w-4 text-center">
                            {qty}
                          </span>
                          <button
                            onClick={() => updateQuantity(product.id, 1)}
                            className="w-6 h-6 rounded-lg text-[#432414] dark:text-[#FEE4D7] font-bold text-xs flex items-center justify-center cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] font-semibold text-[#9F6839]">Listo para servir</span>
                      )}

                      <button
                        onClick={() => addToCart(product, 1)}
                        disabled={!product.is_active}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#9F6839] hover:bg-[#835229] text-white text-xs font-extrabold shadow-xs transition-all cursor-pointer disabled:opacity-40"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{qty > 0 ? 'Agregar +1' : 'Agregar'}</span>
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
                onClick={clearCart}
                className="text-xs text-[#9F6839] hover:text-red-600 flex items-center gap-1 cursor-pointer font-bold"
              >
                <Trash2 className="w-3.5 h-3.5" /> Vaciar
              </button>
            )}
          </div>

          {/* Tipo de Pedido */}
          <div className="grid grid-cols-3 gap-2 my-3">
            {[
              { id: 'Para Llevar', label: 'Llevar', icon: ShoppingBag },
              { id: 'Mesa', label: 'Mesa', icon: Utensils },
              { id: 'Barra', label: 'Barra', icon: Bike }
            ].map((t) => {
              const Icon = t.icon
              const isSel = orderType === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setOrderType(t.id)}
                  className={`py-2 px-2 text-xs font-bold rounded-2xl flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                    isSel
                      ? 'bg-[#9F6839] border-[#9F6839] text-white shadow-xs'
                      : 'bg-white dark:bg-[#201009] border-[#D4B28E] text-[#432414] dark:text-[#FEE4D7]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{t.label}</span>
                </button>
              )
            })}
          </div>

          {orderType === 'Mesa' && (
            <input
              type="text"
              placeholder="Ej: Mesa 4"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="w-full mb-3 bg-[#FEE4D7]/30 dark:bg-[#150904] border border-[#D4B28E] rounded-xl px-3 py-2 text-xs font-semibold text-[#432414] dark:text-[#FEE4D7]"
            />
          )}
        </div>

        {/* Lista de Ítems */}
        <div className="flex-1 overflow-y-auto my-3 pr-1 space-y-2">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-[#9F6839]">
              <Coffee className="w-10 h-10 mb-2 stroke-[1.5]" />
              <p className="text-xs font-bold text-[#432414] dark:text-[#FEE4D7]">El carrito está vacío</p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div
                key={item.product.id}
                className="bg-[#FEE4D7]/30 dark:bg-[#2E180E] border border-[#D4B28E]/70 rounded-2xl p-3 flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-xs text-[#432414] dark:text-[#FEE4D7] truncate">
                    {item.product.name}
                  </h4>
                  <span className="font-extrabold text-xs text-[#9F6839] dark:text-[#DABA8C]">
                    ${(item.product.price * item.quantity).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 bg-white dark:bg-[#150904] border border-[#D4B28E] rounded-xl px-2 py-1 shrink-0">
                  <button
                    onClick={() => updateQuantity(item.product.id, -1)}
                    className="w-4 h-4 text-[#432414] dark:text-[#FEE4D7] font-bold text-xs flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <span className="text-xs font-extrabold text-[#432414] dark:text-[#FEE4D7] w-3 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.product.id, 1)}
                    className="w-4 h-4 text-[#432414] dark:text-[#FEE4D7] font-bold text-xs flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-red-500 ml-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totales y Botón de Cobro */}
        <div className="border-t border-[#D4B28E]/60 dark:border-[#9F6839]/30 pt-3 space-y-2">
          {/* Descuento Estudiantil */}
          <button
            onClick={() => setStudentDiscountApplied(!studentDiscountApplied)}
            className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              studentDiscountApplied
                ? 'bg-[#FEE4D7] border-[#D4B28E] text-[#432414]'
                : 'bg-white dark:bg-[#150904] border-[#D4B28E] text-[#9F6839]'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4" /> Descuento Estudiantil (10%)
            </span>
            <span>{studentDiscountApplied ? '✓ Aplicado' : '+ Aplicar'}</span>
          </button>

          <div className="flex items-center justify-between text-xs text-[#9F6839] dark:text-[#DABA8C]">
            <span>Subtotal:</span>
            <span className="font-semibold text-[#432414] dark:text-[#FEE4D7]">${cartSubtotal.toLocaleString()}</span>
          </div>

          {cartDiscount > 0 && (
            <div className="flex items-center justify-between text-xs text-red-600 font-bold">
              <span>Descuento (10%):</span>
              <span>-${cartDiscount.toLocaleString()}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1 border-t border-[#D4B28E]/40">
            <span className="text-sm font-extrabold text-[#432414] dark:text-[#FEE4D7]">Total a Pagar:</span>
            <span className="text-lg font-extrabold text-[#9F6839] dark:text-[#DABA8C]">${cartTotal.toLocaleString()}</span>
          </div>

          <button
            disabled={cartItems.length === 0}
            onClick={openCheckout}
            className="w-full py-3 px-4 rounded-2xl bg-[#9F6839] hover:bg-[#835229] text-white font-extrabold text-xs shadow-md disabled:opacity-40 transition-all cursor-pointer mt-1"
          >
            Proceder al Cobro (${cartTotal.toLocaleString()})
          </button>
        </div>
      </aside>

      {/* Modal de Cobro & Cliente */}
      <Modal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} title="Finalizar Venta & Cobro">
        <form onSubmit={handleConfirmSale} className="space-y-4">
          {checkoutError && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 text-xs font-bold">
              ⚠️ {checkoutError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#432414] dark:text-[#DABA8C] uppercase tracking-wider mb-1">
              Nombre del Cliente
            </label>
            <input
              type="text"
              list="past-customers-list"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Escribe o selecciona un cliente..."
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#150904] border border-[#D4B28E] text-sm font-semibold text-[#432414] dark:text-[#FEE4D7]"
            />
            <datalist id="past-customers-list">
              <option value="Cliente General" />
              {pastCustomers.map((name, idx) => (
                <option key={idx} value={name} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#432414] dark:text-[#DABA8C] uppercase tracking-wider mb-1">
              Forma de Pago
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#150904] border border-[#D4B28E] text-sm font-semibold text-[#432414] dark:text-[#FEE4D7]"
            >
              <option value="efectivo">💵 Efectivo</option>
              <option value="transferencia">📱 Transferencia Bancaria</option>
              <option value="mixto">💳 Pago Mixto (Efectivo + Transferencia)</option>
            </select>
          </div>

          {paymentMethod === 'efectivo' && (
            <div>
              <label className="block text-xs font-bold text-[#432414] dark:text-[#DABA8C] uppercase tracking-wider mb-1">
                Efectivo Recibido ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#150904] border border-[#D4B28E] text-sm font-semibold text-[#432414] dark:text-[#FEE4D7]"
              />
              {Number(cashAmount) >= cartTotal && (
                <p className="mt-2 text-xs font-bold text-emerald-600">
                  💵 Cambio a entregar: ${(Number(cashAmount) - cartTotal).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {paymentMethod === 'mixto' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#432414] dark:text-[#DABA8C] uppercase tracking-wider mb-1">
                  Monto Efectivo ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#150904] border border-[#D4B28E] text-sm font-semibold text-[#432414] dark:text-[#FEE4D7]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#432414] dark:text-[#DABA8C] uppercase tracking-wider mb-1">
                  Monto Transferencia ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#150904] border border-[#D4B28E] text-sm font-semibold text-[#432414] dark:text-[#FEE4D7]"
                />
              </div>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-[#FEE4D7]/50 dark:bg-[#2E180E] border border-[#D4B28E]/60 flex items-center justify-between">
            <span className="text-xs font-bold text-[#432414] dark:text-[#FEE4D7]">Total a Cobrar:</span>
            <span className="text-lg font-extrabold text-[#9F6839] dark:text-[#DABA8C]">${cartTotal.toLocaleString()}</span>
          </div>

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
              className="px-5 py-2.5 rounded-2xl bg-[#9F6839] hover:bg-[#835229] text-white text-xs font-extrabold shadow-md cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Procesando...' : 'Confirmar Venta & Comanda'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Recibo Exitoso */}
      <Modal isOpen={isReceiptOpen} onClose={() => setIsReceiptOpen(false)} title="¡Venta Exitosa!">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto border-2 border-emerald-300">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-extrabold text-[#432414] dark:text-[#FEE4D7]">
            Venta Registrada Correctamente
          </h3>
          <p className="text-xs font-semibold text-[#9F6839] dark:text-[#DABA8C]">
            La comanda ha sido enviada a cocina en tiempo real.
          </p>

          <button
            onClick={() => setIsReceiptOpen(false)}
            className="w-full py-3 rounded-2xl bg-[#9F6839] text-white font-extrabold text-xs shadow-md cursor-pointer"
          >
            Aceptar & Siguiente Venta
          </button>
        </div>
      </Modal>
    </div>
  )
}