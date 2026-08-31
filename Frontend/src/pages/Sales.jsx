import { useEffect, useState, useMemo } from 'react'
import { api } from '../api/client'
import Modal from '../components/Modal'
import confetti from 'canvas-confetti'
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Flame,
  ShoppingBag,
  CheckCircle2,
  Banknote,
  Smartphone,
  CreditCard,
  Building2,
  AlertCircle,
  AlertTriangle,
  Calendar,
  UserCheck,
  Printer,
  Tag,
  Percent,
  Send,
  Download,
  Package,
  Boxes,
  Sparkles
} from 'lucide-react'
import { downloadReceiptPDF, shareReceiptPDFToWhatsApp } from '../utils/pdfReceipt'

const DEFAULT_PRODUCT_IMAGE = 'https://images.unsplash.com/photo-1582293041079-7814c2f12063?w=600&auto=format&fit=crop&q=80'
const COMMON_BANKS = ['Bre-B/Llave', 'Nequi', 'Daviplata', 'Bancolombia', 'Nu', 'Davivienda', 'BBVA', 'Banco de Bogotá']

export default function Sales() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Clientes
  const [customersList, setCustomersList] = useState([])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')

  // Carrito de compras
  const [cartItems, setCartItems] = useState([])

  // Modal de cobro
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('efectivo')
  const [cashAmount, setCashAmount] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [bankPayments, setBankPayments] = useState([{ bank: 'Bre-B/Llave', amount: '' }])
  const [deductStock, setDeductStock] = useState(true)
  const [isPastDate, setIsPastDate] = useState(false)
  const [customSaleDate, setCustomSaleDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')

  // Sistema de Descuentos
  const [discountType, setDiscountType] = useState('percent') // 'percent' | 'fixed'
  const [discountValue, setDiscountValue] = useState('')
  const [discountReason, setDiscountReason] = useState('')
  const [showDiscountInput, setShowDiscountInput] = useState(false)

  // Modal de Recibo Oficial / Éxito
  const [lastOrder, setLastOrder] = useState(null)
  const [isReceiptOpen, setIsReceiptOpen] = useState(false)

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [prodsData, custData] = await Promise.all([
        api.get('/products'),
        api.get('/customers').catch(() => [])
      ])
      const activeProds = Array.isArray(prodsData) ? prodsData : []
      setProducts(activeProds)
      setCustomersList(Array.isArray(custData) ? custData : [])

      const cats = ['Todos', ...new Set(activeProds.map((p) => p.category || 'Otros').filter(Boolean))]
      setCategories(cats)
    } catch (err) {
      setError('No se pudo cargar el catálogo de productos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function addToCart(product) {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  function updateQuantity(productId, delta) {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + delta
            return nextQty > 0 ? { ...item, quantity: nextQty } : null
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
    setDiscountValue('')
    setDiscountReason('')
    setShowDiscountInput(false)
  }

  // Cálculos del Carrito
  const cartSubtotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + (item.product.price || 0) * item.quantity, 0)
  }, [cartItems])

  const discountCalculated = useMemo(() => {
    const val = Number(discountValue) || 0
    if (val <= 0) return { amount: 0, percent: 0 }
    if (discountType === 'percent') {
      const p = Math.min(100, Math.max(0, val))
      return { amount: (cartSubtotal * p) / 100, percent: p }
    } else {
      const amt = Math.min(cartSubtotal, Math.max(0, val))
      const p = cartSubtotal > 0 ? (amt / cartSubtotal) * 100 : 0
      return { amount: amt, percent: p }
    }
  }, [cartSubtotal, discountType, discountValue])

  const cartTotal = useMemo(() => {
    return Math.max(0, cartSubtotal - discountCalculated.amount)
  }, [cartSubtotal, discountCalculated])

  // Verificación estricta de stock disponible en los productos del carrito
  const hasOutOfStockItems = useMemo(() => {
    return cartItems.some((it) => (it.product.stock ?? 0) < it.quantity)
  }, [cartItems])

  const outOfStockNames = useMemo(() => {
    return cartItems
      .filter((it) => (it.product.stock ?? 0) < it.quantity)
      .map((it) => `${it.product.name} (Stock: ${it.product.stock ?? 0}, Solicitado: ${it.quantity})`)
      .join(', ')
  }, [cartItems])

  function isProductActive(p) {
    return p.active !== false && p.active !== 'false' && p.active !== 0
  }

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!isProductActive(p)) return false
      const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        p.name.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query)) ||
        (p.tags && p.tags.toLowerCase().includes(query))
      return matchesCategory && matchesSearch
    })
  }, [products, selectedCategory, searchQuery])

  function openCheckout() {
    if (cartItems.length === 0) return
    setCustomerName('')
    setCustomerPhone('')
    setSelectedCustomerId('')
    setPaymentMethod('efectivo')
    setCashAmount(String(cartTotal))
    setTransferAmount('0')
    setBankPayments([{ bank: 'Bre-B/Llave', amount: String(cartTotal) }])
    setCheckoutError('')

    if (hasOutOfStockItems) {
      setDeductStock(false)
      setIsPastDate(true)
    } else {
      setDeductStock(true)
      setIsPastDate(false)
    }

    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    setCustomSaleDate(now.toISOString().slice(0, 16))
    setIsCheckoutOpen(true)
  }

  function handleSelectPaymentMethod(method) {
    setPaymentMethod(method)
    setCheckoutError('')
    if (method === 'efectivo') {
      setCashAmount(String(cartTotal))
      setTransferAmount('0')
    } else if (method === 'transferencia') {
      setCashAmount('0')
      setTransferAmount(String(cartTotal))
      setBankPayments([{ bank: 'Bre-B/Llave', amount: String(cartTotal) }])
    } else if (method === 'mixto') {
      const half = Math.round(cartTotal / 2)
      setCashAmount(String(half))
      setTransferAmount(String(cartTotal - half))
      setBankPayments([{ bank: 'Bre-B/Llave', amount: String(cartTotal - half) }])
    }
  }

  function handleAddBank() {
    setBankPayments([...bankPayments, { bank: 'Nequi', amount: '' }])
  }

  function handleRemoveBank(index) {
    setBankPayments(bankPayments.filter((_, i) => i !== index))
  }

  function handleBankChange(index, field, value) {
    const updated = [...bankPayments]
    updated[index][field] = value
    setBankPayments(updated)

    if (field === 'amount') {
      const sum = updated.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
      setTransferAmount(String(sum))
      if (paymentMethod === 'mixto') {
        const remaining = Math.max(0, cartTotal - sum)
        setCashAmount(String(remaining))
      }
    }
  }

  function handleCustomerSelect(e) {
    const custId = e.target.value
    setSelectedCustomerId(custId)
    if (!custId) {
      setCustomerName('')
      setCustomerPhone('')
      return
    }
    const found = customersList.find((c) => c.id === custId)
    if (found) {
      setCustomerName(`${found.first_name} ${found.last_name || ''}`.trim())
      setCustomerPhone(found.phone || '')
    }
  }

  async function handleProcessSale(e) {
    e.preventDefault()
    setSubmitting(true)
    setCheckoutError('')

    try {
      if (hasOutOfStockItems && deductStock) {
        throw new Error(
          `Los productos (${outOfStockNames}) no tienen suficiente stock disponible. No puedes descontar inventario de productos agotados. Desmarca la opción de descontar stock para registrarla como Venta Pasada.`
        )
      }

      const cashVal = Number(cashAmount) || 0
      const transferVal = Number(transferAmount) || 0

      if (paymentMethod === 'efectivo' && cashVal < cartTotal) {
        throw new Error('El monto en efectivo ingresado es menor al total a pagar')
      }
      if (paymentMethod === 'transferencia' && transferVal < cartTotal) {
        throw new Error('El monto de la transferencia debe cubrir el total')
      }
      if (paymentMethod === 'mixto' && cashVal + transferVal < cartTotal) {
        throw new Error('La suma de efectivo y transferencia no cubre el total')
      }

      let bankDetailsString = ''
      if (paymentMethod === 'transferencia' || paymentMethod === 'mixto') {
        bankDetailsString = bankPayments
          .filter((bp) => (Number(bp.amount) || 0) > 0 || bankPayments.length === 1)
          .map((bp) => `${bp.bank}: $${Number(bp.amount || transferVal).toLocaleString('es-CO')}`)
          .join(' | ')
      }

      const payload = {
        customer_name: customerName.trim() || 'Cliente General',
        payment_method: paymentMethod,
        cash_amount: cashVal,
        transfer_amount: transferVal,
        bank_details: bankDetailsString,
        discount_percent: discountCalculated.percent,
        discount_amount: discountCalculated.amount,
        discount_reason: discountReason.trim(),
        deduct_stock: deductStock,
        custom_date: isPastDate ? customSaleDate : undefined,
        items: cartItems.map((it) => ({
          product_id: it.product.id,
          quantity: it.quantity,
          unit_price: it.product.price
        }))
      }

      const result = await api.post('/sales', payload)

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.7 }
      })

      setLastOrder({
        id: result.id,
        customer_name: payload.customer_name,
        customer_phone: customerPhone,
        items: [...cartItems],
        subtotal: cartSubtotal,
        discount_amount: discountCalculated.amount,
        discount_percent: discountCalculated.percent,
        discount_reason: payload.discount_reason,
        total: cartTotal,
        payment_method: paymentMethod,
        cash_amount: cashVal,
        change: paymentMethod === 'efectivo' ? Math.max(0, cashVal - cartTotal) : 0,
        bank_details: bankDetailsString,
        created_at: isPastDate ? new Date(customSaleDate) : new Date()
      })

      setIsCheckoutOpen(false)
      setIsReceiptOpen(true)
      clearCart()
      await loadData() // Refrescar catálogo y stock
    } catch (err) {
      setCheckoutError(err.message || 'Error procesando la venta')
    } finally {
      setSubmitting(false)
    }
  }

  function handlePrintReceipt() {
    window.print()
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-6rem)]">
      {/* Columna Izquierda: Catálogo de Productos (2/3) */}
      <div className="lg:col-span-2 flex flex-col gap-4 overflow-hidden">
        {/* Header & Filtros */}
        <div className="bg-white dark:bg-[#1c0707] p-4 rounded-3xl border border-red-200/70 dark:border-red-950/60 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-xs">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-red-900/40 dark:text-red-400/40" />
            <input
              type="text"
              placeholder="Buscar producto por nombre o categoría..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] placeholder-red-900/40 dark:placeholder-red-400/40 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-xs'
                    : 'bg-red-50/70 dark:bg-[#200808] text-red-950/70 dark:text-red-200/70 hover:bg-red-100/70 dark:hover:bg-red-950/60'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid de Productos */}
        <div className="flex-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-600 border-t-transparent"></div>
              <p className="text-xs font-bold text-red-900/60 dark:text-red-400/60 mt-3">Cargando catálogo...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-[#1c0707] rounded-3xl border border-dashed border-red-200 dark:border-red-950 p-8">
              <Package className="w-12 h-12 mx-auto text-red-400/40 mb-3" />
              <p className="text-base font-black text-[#450a0a] dark:text-[#fef2f2]">No hay productos disponibles</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredProducts.map((prod) => {
                const inCart = cartItems.find((it) => it.product.id === prod.id)
                const currentStock = prod.stock ?? 0
                const isOutOfStock = currentStock <= 0
                const isLowStock = currentStock <= (prod.min_stock_alert || 5) && currentStock > 0

                return (
                  <div
                    key={prod.id}
                    onClick={() => addToCart(prod)}
                    className={`group relative flex flex-col justify-between bg-white dark:bg-[#1c0707] rounded-3xl border transition-all duration-200 overflow-hidden cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5 select-none ${
                      inCart
                        ? 'border-red-600 ring-2 ring-red-500/20'
                        : isOutOfStock
                        ? 'border-zinc-300 dark:border-zinc-800'
                        : isLowStock
                        ? 'border-amber-300 dark:border-amber-900/60'
                        : 'border-red-200/80 dark:border-red-950/60'
                    }`}
                  >
                    {/* Badge de Stock */}
                    <div className="absolute top-2.5 right-2.5 z-10">
                      {isOutOfStock ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-zinc-800 text-white shadow-xs">
                          Agotado ({currentStock})
                        </span>
                      ) : isLowStock ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-500 text-black shadow-xs">
                          Poco Stock ({currentStock})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-600 text-white shadow-xs">
                          {currentStock} uds
                        </span>
                      )}
                    </div>

                    {/* Imagen del Producto */}
                    <div className="relative h-28 w-full bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
                      <img
                        src={prod.image_url || DEFAULT_PRODUCT_IMAGE}
                        alt={prod.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.src = DEFAULT_PRODUCT_IMAGE
                        }}
                      />
                      {inCart && (
                        <div className="absolute inset-0 bg-red-900/40 backdrop-blur-[2px] flex items-center justify-center">
                          <span className="w-8 h-8 rounded-full bg-red-600 text-white font-black text-xs flex items-center justify-center shadow-lg">
                            {inCart.quantity}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Información */}
                    <div className="p-3 flex flex-col flex-1 justify-between">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase text-amber-600 dark:text-amber-400">
                          {prod.category}
                        </span>
                        <h4 className="text-xs font-black text-[#450a0a] dark:text-[#fef2f2] leading-tight line-clamp-1 mt-0.5">
                          {prod.name}
                        </h4>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-red-100 dark:border-red-950">
                        <span className="text-sm font-black text-red-600 dark:text-amber-400">
                          ${Number(prod.price).toLocaleString('es-CO')}
                        </span>
                        <button
                          type="button"
                          className="p-1.5 rounded-xl bg-red-50 dark:bg-[#200808] text-red-600 dark:text-amber-400 group-hover:bg-red-600 group-hover:text-white transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Columna Derecha: Carrito de Compras & Descuentos (1/3) */}
      <div className="flex flex-col bg-white dark:bg-[#1c0707] rounded-3xl border border-red-200/80 dark:border-red-950/60 shadow-xs overflow-hidden">
        {/* Header Carrito */}
        <div className="p-4 border-b border-red-200/60 dark:border-red-950/60 flex items-center justify-between bg-red-50/30 dark:bg-[#200808]">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-red-100 dark:bg-red-950 text-red-600 dark:text-amber-400">
              <ShoppingBag className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-black text-sm text-[#450a0a] dark:text-[#fef2f2]">Orden en Curso</h3>
              <span className="text-[10px] font-bold text-red-900/60 dark:text-red-300/60">
                {cartItems.reduce((acc, it) => acc + it.quantity, 0)} artículos
              </span>
            </div>
          </div>

          {cartItems.length > 0 && (
            <button
              onClick={clearCart}
              className="text-[10px] font-black text-red-600 hover:text-red-700 uppercase tracking-wider cursor-pointer"
            >
              Vaciar
            </button>
          )}
        </div>

        {/* Lista de Items en Carrito */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {cartItems.length === 0 ? (
            <div className="text-center py-16 text-red-900/40 dark:text-red-400/40">
              <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-bold">Haz clic en los productos para agregarlos al pedido</p>
            </div>
          ) : (
            cartItems.map((item) => {
              const isItemOutOfStock = (item.product.stock ?? 0) < item.quantity
              return (
                <div
                  key={item.product.id}
                  className={`flex items-center justify-between p-2.5 rounded-2xl border text-xs font-bold transition-all ${
                    isItemOutOfStock
                      ? 'bg-amber-50/70 dark:bg-[#2a0e0e] border-amber-300 dark:border-amber-900'
                      : 'bg-red-50/30 dark:bg-[#200808] border-red-200/50 dark:border-red-950/60'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <h5 className="font-black text-[#450a0a] dark:text-[#fef2f2] truncate">
                      {item.product.name}
                    </h5>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-red-600 dark:text-amber-400 font-extrabold">
                        ${(item.product.price * item.quantity).toLocaleString('es-CO')}
                      </span>
                      {isItemOutOfStock && (
                        <span className="text-[9px] font-black text-amber-700 dark:text-amber-300">
                          (Sin stock: disp. {item.product.stock ?? 0})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Controles de Cantidad */}
                  <div className="flex items-center gap-1.5 bg-white dark:bg-[#140505] p-1 rounded-xl border border-red-200/60 dark:border-red-950">
                    <button
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="p-1 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-black px-1">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, 1)}
                      className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="p-1.5 text-red-400 hover:text-red-600 cursor-pointer shrink-0 ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* Footer del Carrito */}
        {cartItems.length > 0 && (
          <div className="p-4 border-t border-red-200/60 dark:border-red-950/60 bg-red-50/50 dark:bg-[#180606] space-y-3">
            {/* Aviso si hay productos agotados */}
            {hasOutOfStockItems && (
              <div className="p-2.5 rounded-xl bg-amber-100/90 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-[11px] font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Hay productos sin stock. Se procesará como <strong>Venta Pasada</strong>.</span>
              </div>
            )}

            {/* Opción de Descuento */}
            <div>
              {!showDiscountInput ? (
                <button
                  type="button"
                  onClick={() => setShowDiscountInput(true)}
                  className="flex items-center gap-1.5 text-xs font-black text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>+ Aplicar Descuento / Promoción</span>
                </button>
              ) : (
                <div className="p-3 rounded-2xl bg-white dark:bg-[#200808] border border-amber-300 dark:border-amber-900/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-amber-600">Descuento</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setDiscountType('percent')}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black cursor-pointer ${
                          discountType === 'percent' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        %
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountType('fixed')}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black cursor-pointer ${
                          discountType === 'fixed' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        $
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min="0"
                      max={discountType === 'percent' ? 100 : cartSubtotal}
                      placeholder={discountType === 'percent' ? 'Ej. 10%' : 'Ej. $2000'}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className="px-3 py-1.5 rounded-xl bg-red-50/50 dark:bg-[#140505] border border-red-200 text-xs font-bold focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Motivo (ej. Promo)"
                      value={discountReason}
                      onChange={(e) => setDiscountReason(e.target.value)}
                      className="px-3 py-1.5 rounded-xl bg-red-50/50 dark:bg-[#140505] border border-red-200 text-xs font-bold focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Desglose de totales */}
            <div className="space-y-1.5 text-xs font-bold">
              <div className="flex items-center justify-between text-red-950/70 dark:text-red-200/70">
                <span>Subtotal:</span>
                <span>${cartSubtotal.toLocaleString('es-CO')}</span>
              </div>

              {discountCalculated.amount > 0 && (
                <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                  <span>Descuento ({discountCalculated.percent.toFixed(0)}%):</span>
                  <span>-${discountCalculated.amount.toLocaleString('es-CO')}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-base font-black text-[#450a0a] dark:text-[#fef2f2] pt-1.5 border-t border-red-200/60 dark:border-red-950/60">
                <span>Total a Cobrar:</span>
                <span className="text-red-600 dark:text-amber-400">
                  ${cartTotal.toLocaleString('es-CO')}
                </span>
              </div>
            </div>

            {/* Botón Cobrar */}
            <button
              onClick={openCheckout}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-black text-sm shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Cobrar ${cartTotal.toLocaleString('es-CO')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal de Cobro y Cliente */}
      <Modal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} title="Completar Venta">
        <form onSubmit={handleProcessSale} className="space-y-4">
          {checkoutError && (
            <div className="p-3 rounded-2xl bg-red-100 text-red-700 text-xs font-bold">{checkoutError}</div>
          )}

          {/* Banner de Aviso si hay productos agotados */}
          {hasOutOfStockItems && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-[#200808] border border-amber-300 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 text-xs font-bold space-y-1">
              <div className="flex items-center gap-1.5 font-black text-amber-700 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Producto sin stock disponible</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                {outOfStockNames} no tienen existencias suficientes. Esta venta se guardará obligatoriamente como <strong>Venta Pasada (sin descontar stock)</strong>.
              </p>
            </div>
          )}

          {/* Selección de Cliente */}
          <div>
            <label className="block text-xs font-black uppercase text-red-950 dark:text-red-200 mb-1">
              Cliente (Opcional)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={selectedCustomerId}
                onChange={handleCustomerSelect}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200/60 dark:border-red-950 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] focus:outline-none"
              >
                <option value="">👤 Cliente de Mostrador (General)</option>
                {customersList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name || ''} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="O escribe nombre del cliente..."
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200/60 dark:border-red-950 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] focus:outline-none"
              />
            </div>
          </div>

          {/* Método de Pago */}
          <div>
            <label className="block text-xs font-black uppercase text-red-950 dark:text-red-200 mb-2">
              Método de Pago
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'efectivo', label: 'Efectivo', icon: Banknote },
                { id: 'transferencia', label: 'Transferencia', icon: Smartphone },
                { id: 'mixto', label: 'Mixto', icon: CreditCard }
              ].map((m) => {
                const Icon = m.icon
                const active = paymentMethod === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectPaymentMethod(m.id)}
                    className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-black cursor-pointer transition-all ${
                      active
                        ? 'bg-red-600 text-white border-red-600 shadow-xs'
                        : 'bg-red-50/50 dark:bg-[#200808] border-red-200/60 dark:border-red-950 text-red-950/70 dark:text-red-200/70 hover:bg-red-100/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{m.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Campos según método */}
          {paymentMethod === 'efectivo' && (
            <div className="p-3.5 rounded-2xl bg-red-50/40 dark:bg-[#200808] border border-red-200/60 dark:border-red-950 space-y-2">
              <label className="block text-xs font-bold text-red-950 dark:text-red-200">
                Efectivo Recibido ($)
              </label>
              <input
                type="number"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                placeholder={String(cartTotal)}
                className="w-full px-4 py-2 rounded-xl bg-white dark:bg-[#140505] border border-red-200 text-sm font-black focus:outline-none"
              />
              {Number(cashAmount) >= cartTotal && (
                <div className="flex justify-between items-center text-xs font-black text-emerald-600 dark:text-emerald-400 pt-1">
                  <span>Cambio / Vueltos:</span>
                  <span className="text-sm">
                    ${(Number(cashAmount) - cartTotal).toLocaleString('es-CO')}
                  </span>
                </div>
              )}
            </div>
          )}

          {(paymentMethod === 'transferencia' || paymentMethod === 'mixto') && (
            <div className="p-3.5 rounded-2xl bg-red-50/40 dark:bg-[#200808] border border-red-200/60 dark:border-red-950 space-y-3">
              <label className="block text-xs font-bold text-red-950 dark:text-red-200">
                Desglose de Transferencia / Bancos
              </label>

              {bankPayments.map((bp, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={bp.bank}
                    onChange={(e) => handleBankChange(idx, 'bank', e.target.value)}
                    className="w-1/2 px-3 py-2 rounded-xl bg-white dark:bg-[#140505] border border-red-200 text-xs font-bold"
                  >
                    {COMMON_BANKS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Monto ($)"
                    value={bp.amount}
                    onChange={(e) => handleBankChange(idx, 'amount', e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-[#140505] border border-red-200 text-xs font-bold focus:outline-none"
                  />
                  {bankPayments.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveBank(idx)}
                      className="p-2 text-red-500 hover:text-red-700 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddBank}
                className="text-[11px] font-black text-red-600 dark:text-amber-400 hover:underline cursor-pointer"
              >
                + Añadir otro banco (pago dividido)
              </button>
            </div>
          )}

          {/* Opciones Avanzadas: Descuento de Stock & Fecha Pasada */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1c0707] border border-red-200 dark:border-red-950 space-y-3">
            {/* Toggle de Descontar Stock */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-red-600 dark:text-amber-400" />
                <div>
                  <span className="text-xs font-black text-[#450a0a] dark:text-[#fef2f2] block">
                    Descontar del inventario de stock
                  </span>
                  {hasOutOfStockItems && (
                    <span className="text-[10px] text-amber-600 font-bold">
                      Desactivado por falta de stock
                    </span>
                  )}
                </div>
              </div>
              <input
                type="checkbox"
                disabled={hasOutOfStockItems}
                checked={deductStock}
                onChange={(e) => setDeductStock(e.target.checked)}
                className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer disabled:opacity-50"
              />
            </div>

            {/* Toggle de Registrar Fecha Pasada */}
            <div className="flex items-center justify-between pt-2 border-t border-red-100 dark:border-red-950">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-black text-[#450a0a] dark:text-[#fef2f2]">
                  Registrar venta en fecha/hora pasada
                </span>
              </div>
              <input
                type="checkbox"
                checked={isPastDate}
                onChange={(e) => setIsPastDate(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
            </div>

            {isPastDate && (
              <div className="pt-2">
                <input
                  type="datetime-local"
                  value={customSaleDate}
                  onChange={(e) => setCustomSaleDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-red-50/50 dark:bg-[#200808] border border-red-200 text-xs font-bold focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-red-100 dark:border-red-950">
            <button
              type="button"
              onClick={() => setIsCheckoutOpen(false)}
              className="px-5 py-2.5 rounded-2xl text-xs font-bold text-red-950/70 dark:text-red-200/70 hover:bg-red-100 dark:hover:bg-red-950 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-7 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-black text-xs shadow-md cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Procesando...' : `Confirmar Venta $${cartTotal.toLocaleString('es-CO')}`}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Recibo Oficial / Factura */}
      <Modal isOpen={isReceiptOpen} onClose={() => setIsReceiptOpen(false)} title="Venta Realizada con Éxito">
        {lastOrder && (
          <div className="space-y-4">
            {/* Ticket Printable View */}
            <div id="printable-receipt" className="p-5 rounded-3xl bg-white border-2 border-dashed border-red-200 text-black space-y-3 font-mono text-xs">
              <div className="text-center pb-2 border-b border-gray-200">
                <img src="/logo.png" alt="Enchiladitos Logo" className="w-12 h-12 mx-auto mb-1.5 object-contain" />
                <h2 className="font-black text-sm uppercase tracking-wider text-black">ENCHILADITOS</h2>
                <p className="text-[10px] text-gray-500">Sabor, Chamoy y Fuego</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {new Date(lastOrder.created_at).toLocaleString('es-CO')}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold">Cliente: {lastOrder.customer_name}</p>
                <p className="text-[10px] text-gray-500">Pago: {lastOrder.payment_method.toUpperCase()}</p>
              </div>

              <div className="space-y-1 py-2 border-y border-gray-200">
                {lastOrder.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>
                      {it.quantity}x {it.product.name}
                    </span>
                    <span>${(it.product.price * it.quantity).toLocaleString('es-CO')}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-right">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span>${lastOrder.subtotal.toLocaleString('es-CO')}</span>
                </div>
                {lastOrder.discount_amount > 0 && (
                  <div className="flex justify-between text-red-600 font-bold">
                    <span>Descuento ({lastOrder.discount_reason || 'Descuento'}):</span>
                    <span>-${lastOrder.discount_amount.toLocaleString('es-CO')}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm pt-1 border-t border-gray-200">
                  <span>TOTAL:</span>
                  <span>${lastOrder.total.toLocaleString('es-CO')}</span>
                </div>
                {lastOrder.payment_method === 'efectivo' && lastOrder.change > 0 && (
                  <div className="flex justify-between text-[11px] text-emerald-700">
                    <span>Cambio Devuelto:</span>
                    <span>${lastOrder.change.toLocaleString('es-CO')}</span>
                  </div>
                )}
              </div>

              <div className="text-center pt-2 border-t border-gray-200 text-[10px] text-gray-500">
                ¡Gracias por tu compra!
              </div>
            </div>

            {/* Botones de Acción (PDF, WhatsApp, Imprimir) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
              <button
                onClick={() => downloadReceiptPDF(lastOrder)}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs cursor-pointer transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Descargar PDF</span>
              </button>

              <button
                onClick={() => shareReceiptPDFToWhatsApp(lastOrder)}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs cursor-pointer transition-colors shadow-md"
              >
                <Send className="w-4 h-4" />
                <span>Enviar a WhatsApp (PDF)</span>
              </button>

              <button
                onClick={handlePrintReceipt}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs cursor-pointer transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}