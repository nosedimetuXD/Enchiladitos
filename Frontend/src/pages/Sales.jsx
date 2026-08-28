import { useEffect, useState, useMemo } from 'react'
import { api } from '../api/client'
import Modal from '../components/Modal'
import confetti from 'canvas-confetti'
import { processImageUrl } from '../utils/imageUtils'
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Flame,
  ShoppingBag,
  Heart,
  CheckCircle2,
  Banknote,
  Smartphone,
  CreditCard,
  Building2,
  AlertCircle,
  Calendar,
  UserCheck,
  Clock,
  Printer
} from 'lucide-react'

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

  // Almacenamiento local de URLs de imagen por ID de producto
  const [productImages, setProductImages] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('enchiladitos_product_images') || localStorage.getItem('toffe_product_images') || '{}')
    } catch (e) {
      return {}
    }
  })

  // Carrito de compras
  const [cartItems, setCartItems] = useState([])
  const [tipAmount, setTipAmount] = useState(0)

  // Modal de cobro y cliente
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('efectivo')
  const [cashAmount, setCashAmount] = useState('')
  const [transferAmount, setTransferAmount] = useState('')

  // Fecha personalizada para ventas pasadas
  const [isPastDate, setIsPastDate] = useState(false)
  const [customSaleDate, setCustomSaleDate] = useState(() => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
  })
  
  // Desglose de Bancos / Entidades para Transferencia y Pago Mixto
  const [bankPayments, setBankPayments] = useState([
    { bank: 'Bre-B/Llave', amount: '' }
  ])

  const [submitting, setSubmitting] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')

  // Modal Recibo impreso / éxito
  const [lastOrder, setLastOrder] = useState(null)
  const [isReceiptOpen, setIsReceiptOpen] = useState(false)

  const isProductActive = (p) => typeof p.active !== 'undefined' ? p.active : (p.is_active ?? true)

  async function loadData() {
    try {
      const [prodData, custData] = await Promise.all([
        api.get('/products'),
        api.get('/customers').catch(() => [])
      ])
      setProducts(prodData || [])
      setCustomersList(custData || [])

      const cats = Array.from(new Set((prodData || []).map((p) => p.category))).filter(Boolean)
      setCategories(['Todos', ...cats])
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
      if (!isProductActive(p)) return false
      const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [products, selectedCategory, searchQuery])

  function openCheckout() {
    if (cartItems.length === 0) return
    setCustomerName('')
    setSelectedCustomerId('')
    setPaymentMethod('efectivo')
    setCashAmount(String(cartTotal))
    setTransferAmount('0')
    setBankPayments([{ bank: 'Bre-B/Llave', amount: String(cartTotal) }])
    setCheckoutError('')
    setIsPastDate(false)
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

  // Manejo de desglose de bancos
  function addBankLine() {
    setBankPayments((prev) => [...prev, { bank: 'Bre-B/Llave', amount: '' }])
  }

  function removeBankLine(index) {
    if (bankPayments.length <= 1) return
    setBankPayments((prev) => prev.filter((_, i) => i !== index))
  }

  function updateBankLine(index, field, value) {
    setBankPayments((prev) => {
      const next = prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
      
      // Auto-calcular suma de transferencias
      if (field === 'amount') {
        const sumTransfers = next.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
        setTransferAmount(String(sumTransfers))
      }
      return next
    })
  }

  function handleSelectRegisteredCustomer(e) {
    const custId = e.target.value
    setSelectedCustomerId(custId)
    if (!custId) {
      setCustomerName('')
      return
    }
    const found = customersList.find((c) => c.id === custId)
    if (found) {
      setCustomerName(`${found.first_name} ${found.last_name}`.trim())
    }
  }

  async function handleConfirmSale(e) {
    e.preventDefault()
    setSubmitting(true)
    setCheckoutError('')

    const finalCustomer = customerName.trim() || 'Cliente General'
    let numCash = Number(cashAmount) || 0
    let numTransfer = Number(transferAmount) || 0
    let bankDetailsStr = ''

    if (paymentMethod === 'efectivo') {
      if (numCash < cartTotal) {
        setCheckoutError(`El efectivo entregado ($${numCash.toLocaleString()}) es menor al total del pedido ($${cartTotal.toLocaleString()})`)
        setSubmitting(false)
        return
      }
      numTransfer = 0
    } else if (paymentMethod === 'transferencia') {
      numCash = 0
      const bankNamesSeen = new Set()

      for (const b of bankPayments) {
        const bankNameClean = b.bank.trim().toLowerCase()
        const bankAmountNum = Number(b.amount) || 0

        if (!bankNameClean) {
          setCheckoutError('Por favor selecciona o escribe el nombre del banco/entidad para cada transferencia.')
          setSubmitting(false)
          return
        }

        if (bankAmountNum <= 0) {
          setCheckoutError(`El monto asignado a "${b.bank}" debe ser mayor a $0.`)
          setSubmitting(false)
          return
        }

        if (bankNamesSeen.has(bankNameClean)) {
          setCheckoutError(`Has ingresado "${b.bank}" más de una vez. Por favor consolida el monto en una sola línea.`)
          setSubmitting(false)
          return
        }
        bankNamesSeen.add(bankNameClean)
      }

      numTransfer = bankPayments.reduce((sum, b) => sum + (Number(b.amount) || 0), 0)

      if (numTransfer !== cartTotal) {
        if (numTransfer < cartTotal) {
          setCheckoutError(`La suma de transferencias ($${numTransfer.toLocaleString()}) es inferior al total del pedido ($${cartTotal.toLocaleString()}).`)
        } else {
          setCheckoutError(`La suma de transferencias ($${numTransfer.toLocaleString()}) supera el total del pedido ($${cartTotal.toLocaleString()}).`)
        }
        setSubmitting(false)
        return
      }

      bankDetailsStr = bankPayments.map((b) => `${b.bank.trim()}: $${Number(b.amount).toLocaleString()}`).join(' | ')
    } else if (paymentMethod === 'mixto') {
      if (numCash <= 0) {
        setCheckoutError('En Pago Mixto el abono en efectivo debe ser mayor a $0.')
        setSubmitting(false)
        return
      }

      const bankNamesSeen = new Set()
      for (const b of bankPayments) {
        const bankNameClean = b.bank.trim().toLowerCase()
        const bankAmountNum = Number(b.amount) || 0

        if (!bankNameClean) {
          setCheckoutError('Por favor selecciona o escribe el nombre del banco/entidad.')
          setSubmitting(false)
          return
        }

        if (bankAmountNum <= 0) {
          setCheckoutError(`En Pago Mixto el abono por transferencia en "${b.bank}" debe ser mayor a $0.`)
          setSubmitting(false)
          return
        }

        if (bankNamesSeen.has(bankNameClean)) {
          setCheckoutError(`Has ingresado "${b.bank}" más de una vez. Por favor consolida el monto en una sola línea.`)
          setSubmitting(false)
          return
        }
        bankNamesSeen.add(bankNameClean)
      }

      numTransfer = bankPayments.reduce((sum, b) => sum + (Number(b.amount) || 0), 0)

      if (numTransfer <= 0) {
        setCheckoutError('En Pago Mixto el abono por transferencia debe ser mayor a $0.')
        setSubmitting(false)
        return
      }

      if (numCash + numTransfer !== cartTotal) {
        if (numCash + numTransfer < cartTotal) {
          setCheckoutError(`La suma de efectivo ($${numCash.toLocaleString()}) + transferencias ($${numTransfer.toLocaleString()}) es $${(numCash + numTransfer).toLocaleString()}, inferior al total ($${cartTotal.toLocaleString()}).`)
        } else {
          setCheckoutError(`La suma de efectivo ($${numCash.toLocaleString()}) + transferencias ($${numTransfer.toLocaleString()}) es $${(numCash + numTransfer).toLocaleString()}, mayor al total ($${cartTotal.toLocaleString()}).`)
        }
        setSubmitting(false)
        return
      }

      bankDetailsStr = bankPayments.map((b) => `${b.bank.trim()}: $${Number(b.amount).toLocaleString()}`).join(' | ')
    }

    try {
      const payload = {
        customer_name: finalCustomer,
        customer_id: selectedCustomerId || undefined,
        payment_method: paymentMethod,
        cash_amount: numCash,
        transfer_amount: numTransfer,
        bank_details: bankDetailsStr,
        custom_date: isPastDate && customSaleDate ? customSaleDate : undefined,
        items: cartItems.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.product.price
        }))
      }

      const createdSale = await api.post('/sales', payload)

      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } })

      setLastOrder({
        ...createdSale,
        items: cartItems,
        total: cartTotal,
        customer_name: payload.customer_name,
        payment_method: payload.payment_method,
        bank_details: payload.bank_details,
        sale_date: createdSale.created_at || (isPastDate && customSaleDate ? customSaleDate : new Date().toISOString())
      })
      setIsCheckoutOpen(false)
      clearCart()
      setIsReceiptOpen(true)
      await loadData()
    } catch (err) {
      setCheckoutError(err.message || 'No se pudo procesar la venta en caja')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <p className="p-4 text-sm font-semibold text-red-600">Cargando catálogo Enchiladitos POS...</p>

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-6rem)]">
      {/* Catálogo de Productos (Izquierda - 8 cols) */}
      <div className="lg:col-span-8 flex flex-col space-y-4 overflow-hidden">
        {/* Header de Filtros y Búsqueda */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#1c0707] p-4 rounded-3xl border border-red-200 dark:border-red-950/60 shadow-xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-red-500" />
            <input
              type="text"
              placeholder="Buscar gomitas, sparkies, combos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-2xl bg-[#fff5f2] dark:bg-[#140505] border border-red-200 dark:border-red-950 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-xs'
                    : 'bg-red-50 dark:bg-[#240a0a] border border-red-200/80 dark:border-red-950 text-[#450a0a] dark:text-[#fef2f2] hover:bg-red-100 dark:hover:bg-red-950/60'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-red-50 text-red-700 border border-red-200 text-xs font-bold">
            ⚠️ {error}
          </div>
        )}

        {/* Grid de Productos */}
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {filteredProducts.map((p) => {
              const rawImg = productImages[p.id] || p.image_url || DEFAULT_PRODUCT_IMAGE
              const displayImg = processImageUrl(rawImg)

              return (
                <div
                  key={p.id}
                  onClick={() => addToCart(p, 1)}
                  className="bg-white dark:bg-[#1c0707] border border-red-200/80 dark:border-red-950/60 rounded-3xl p-3.5 shadow-xs hover:shadow-md hover:border-red-500 transition-all cursor-pointer flex flex-col justify-between group overflow-hidden"
                >
                  <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden mb-2.5 bg-red-50 dark:bg-[#140505] border border-red-100 dark:border-red-950">
                    <img
                      src={displayImg}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.src = DEFAULT_PRODUCT_IMAGE
                      }}
                    />
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-0.5 rounded-full bg-red-600/90 text-white font-black text-[10px] shadow-xs backdrop-blur-xs">
                        ${p.price.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-extrabold text-xs text-[#450a0a] dark:text-[#fef2f2] group-hover:text-red-600 transition-colors line-clamp-1">
                      {p.name}
                    </h4>
                    <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 line-clamp-1 mt-0.5">
                      {p.description || 'Delicioso producto enchilado'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      addToCart(p, 1)
                    }}
                    className="mt-3 w-full py-1.5 rounded-xl bg-red-50 dark:bg-red-950/50 hover:bg-red-600 hover:text-white text-red-600 dark:text-red-300 font-extrabold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer border border-red-200/60 dark:border-red-900/40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar</span>
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Panel Carrito / Caja (Derecha - 4 cols) */}
      <aside className="lg:col-span-4 flex flex-col bg-white dark:bg-[#1c0707] border border-red-200 dark:border-red-950/60 rounded-3xl p-4 shadow-xs overflow-hidden h-full">
        <div className="flex items-center justify-between pb-3 border-b border-red-200/70 dark:border-red-950">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-[#450a0a] dark:text-[#fef2f2]">
                Orden Actual
              </h3>
              <span className="text-[10px] font-extrabold text-amber-600">
                {cartItems.reduce((sum, item) => sum + item.quantity, 0)} artículos
              </span>
            </div>
          </div>

          {cartItems.length > 0 && (
            <button
              onClick={clearCart}
              className="text-[11px] font-bold text-red-500 hover:text-red-700 transition-colors cursor-pointer"
            >
              Vaciar
            </button>
          )}
        </div>

        {/* Lista de Items en Carrito */}
        <div className="flex-1 overflow-y-auto space-y-2 py-3 pr-1">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-red-400/80 space-y-2">
              <Flame className="w-12 h-12 opacity-30 text-red-500 animate-pulse" />
              <p className="text-xs font-bold text-[#450a0a] dark:text-[#fef2f2]">Tu orden está vacía</p>
              <p className="text-[11px] text-amber-700/70 dark:text-amber-400/70">
                Haz clic en cualquier producto del menú para comenzar
              </p>
            </div>
          ) : (
            cartItems.map((item) => {
              const rawImg = productImages[item.product.id] || item.product.image_url || DEFAULT_PRODUCT_IMAGE
              const displayImg = processImageUrl(rawImg)

              return (
                <div
                  key={item.product.id}
                  className="p-2.5 rounded-2xl bg-[#fff5f2] dark:bg-[#240a0a] border border-red-100 dark:border-red-950 flex items-center justify-between gap-3 text-xs"
                >
                  <img
                    src={displayImg}
                    alt={item.product.name}
                    className="w-10 h-10 rounded-xl object-cover border border-red-200 shrink-0"
                    onError={(e) => {
                      e.target.src = DEFAULT_PRODUCT_IMAGE
                    }}
                  />

                  <div className="flex-1 min-w-0">
                    <h5 className="font-black text-[#450a0a] dark:text-[#fef2f2] truncate">
                      {item.product.name}
                    </h5>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-extrabold">
                      ${item.product.price.toLocaleString()} c/u
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="w-6 h-6 rounded-lg bg-white dark:bg-[#140505] border border-red-200 dark:border-red-900 flex items-center justify-center text-[#450a0a] dark:text-white hover:bg-red-600 hover:text-white cursor-pointer font-black"
                    >
                      <Minus className="w-3 h-3" />
                    </button>

                    <span className="w-5 text-center font-black text-xs text-[#450a0a] dark:text-[#fef2f2]">
                      {item.quantity}
                    </span>

                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product.id, 1)}
                      className="w-6 h-6 rounded-lg bg-white dark:bg-[#140505] border border-red-200 dark:border-red-900 flex items-center justify-center text-[#450a0a] dark:text-white hover:bg-red-600 hover:text-white cursor-pointer font-black"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-black text-[#450a0a] dark:text-[#fef2f2]">
                      ${(item.product.price * item.quantity).toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-red-400 hover:text-red-600 cursor-pointer p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Resumen de Cuenta & Botón de Cobro */}
        <div className="pt-3 border-t border-red-200/70 dark:border-red-950 space-y-2">
          <div className="flex justify-between text-xs font-bold text-[#450a0a]/80 dark:text-[#fef2f2]/80">
            <span>Subtotal</span>
            <span>${cartSubtotal.toLocaleString()}</span>
          </div>

          <div className="flex justify-between text-sm font-black text-[#450a0a] dark:text-[#fef2f2] pt-1">
            <span>Total a Cobrar</span>
            <span className="text-base text-red-600 dark:text-amber-400">${cartTotal.toLocaleString()}</span>
          </div>

          <button
            type="button"
            onClick={openCheckout}
            disabled={cartItems.length === 0}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-black text-sm shadow-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Cobrar Venta (${cartTotal.toLocaleString()})
          </button>
        </div>
      </aside>

      {/* Modal de Cobro */}
      <Modal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} title="Completar Venta">
        <form onSubmit={handleConfirmSale} className="space-y-4">
          {checkoutError && (
            <div className="p-3.5 rounded-2xl bg-red-50 text-red-700 border border-red-200 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{checkoutError}</span>
            </div>
          )}

          {/* Selector de Cliente */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black text-[#450a0a] dark:text-amber-300 uppercase tracking-wider">
                Cliente (Opcional)
              </label>
              {customersList.length > 0 && (
                <span className="text-[10px] text-amber-600 font-bold">
                  {customersList.length} clientes registrados
                </span>
              )}
            </div>

            {customersList.length > 0 && (
              <select
                value={selectedCustomerId}
                onChange={handleSelectRegisteredCustomer}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#140505] border border-red-200 dark:border-red-950 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] focus:outline-none focus:ring-2 focus:ring-red-500 mb-1"
              >
                <option value="">-- Seleccionar de clientes registrados o escribir abajo --</option>
                {customersList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>
            )}

            <input
              type="text"
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value)
                setSelectedCustomerId('')
              }}
              placeholder="Nombre del cliente (ej. Juan Pérez, Cliente General)"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#140505] border border-red-200 dark:border-red-950 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Fecha Personalizada (Para registrar ventas pasadas) */}
          <div className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPastDate}
                  onChange={(e) => setIsPastDate(e.target.checked)}
                  className="rounded-md text-red-600 focus:ring-red-500"
                />
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>¿Registrar venta con fecha anterior?</span>
              </label>
              <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">
                {isPastDate ? 'Fecha personalizada' : 'Fecha actual (Ahora)'}
              </span>
            </div>

            {isPastDate && (
              <div className="pt-1">
                <input
                  type="datetime-local"
                  value={customSaleDate}
                  onChange={(e) => setCustomSaleDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#140505] border border-amber-300 dark:border-amber-800 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}
          </div>

          {/* Método de Pago */}
          <div>
            <label className="block text-xs font-black text-[#450a0a] dark:text-amber-300 uppercase tracking-wider mb-1">
              Método de Pago
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'efectivo', label: 'Efectivo', icon: Banknote },
                { id: 'transferencia', label: 'Transferencia', icon: Smartphone },
                { id: 'mixto', label: 'Pago Mixto', icon: CreditCard }
              ].map((m) => {
                const Icon = m.icon
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectPaymentMethod(m.id)}
                    className={`py-2.5 px-2 rounded-2xl border text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      paymentMethod === m.id
                        ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white border-transparent shadow-xs'
                        : 'bg-white dark:bg-[#140505] border-red-200 dark:border-red-950 text-[#450a0a] dark:text-[#fef2f2]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{m.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <datalist id="banks-list">
            {COMMON_BANKS.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>

          {/* Pago 1: Efectivo */}
          {paymentMethod === 'efectivo' && (
            <div>
              <label className="block text-xs font-black text-[#450a0a] dark:text-amber-300 uppercase tracking-wider mb-1">
                Efectivo Recibido ($)
              </label>
              <input
                type="number"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                placeholder="Monto entregado por el cliente..."
                required
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#140505] border border-red-200 dark:border-red-950 text-sm font-bold text-[#450a0a] dark:text-[#fef2f2] focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              {Number(cashAmount) >= cartTotal && (
                <p className="mt-1 text-xs text-emerald-600 font-black flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Cambio a Devolver: ${(Number(cashAmount) - cartTotal).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Pago 2: Transferencia */}
          {paymentMethod === 'transferencia' && (
            <div className="space-y-3 p-3.5 rounded-2xl bg-red-50/50 dark:bg-[#240a0a] border border-red-200 dark:border-red-950">
              <span className="block text-xs font-black text-[#450a0a] dark:text-[#fef2f2] flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-red-600" />
                Detalle de Entidad / Banco de Transferencia
              </span>

              {bankPayments.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    list="banks-list"
                    placeholder="Banco (Nequi, Daviplata, etc.)"
                    value={item.bank}
                    onChange={(e) => updateBankLine(idx, 'bank', e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-[#140505] border border-red-200 dark:border-red-950 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2]"
                  />

                  <input
                    type="number"
                    placeholder="Monto ($)"
                    value={item.amount}
                    onChange={(e) => updateBankLine(idx, 'amount', e.target.value)}
                    className="w-32 px-3 py-2 rounded-xl bg-white dark:bg-[#140505] border border-red-200 dark:border-red-950 text-xs font-black text-[#450a0a] dark:text-[#fef2f2]"
                  />

                  {bankPayments.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBankLine(idx)}
                      className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-950/60 rounded-xl cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={addBankLine}
                className="inline-flex items-center gap-1 text-[11px] font-black text-red-600 hover:underline cursor-pointer pt-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Dividir en otro banco</span>
              </button>
            </div>
          )}

          {/* Pago 3: Pago Mixto */}
          {paymentMethod === 'mixto' && (
            <div className="space-y-4 p-3.5 rounded-2xl bg-red-50/50 dark:bg-[#240a0a] border border-red-200 dark:border-red-950">
              <div>
                <label className="block text-xs font-black text-[#450a0a] dark:text-amber-300 uppercase tracking-wider mb-1">
                  Abono en Efectivo ($)
                </label>
                <input
                  type="number"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  placeholder="0"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#140505] border border-red-200 dark:border-red-950 text-sm font-bold text-[#450a0a] dark:text-[#fef2f2]"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-red-200 dark:border-red-950">
                <span className="block text-xs font-black text-[#450a0a] dark:text-[#fef2f2] flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-red-600" />
                  Abonos por Transferencia (Bancos)
                </span>

                {bankPayments.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      list="banks-list"
                      placeholder="Banco"
                      value={item.bank}
                      onChange={(e) => updateBankLine(idx, 'bank', e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-[#140505] border border-red-200 dark:border-red-950 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2]"
                    />

                    <input
                      type="number"
                      placeholder="Monto ($)"
                      value={item.amount}
                      onChange={(e) => updateBankLine(idx, 'amount', e.target.value)}
                      className="w-32 px-3 py-2 rounded-xl bg-white dark:bg-[#140505] border border-red-200 dark:border-red-950 text-xs font-black text-[#450a0a] dark:text-[#fef2f2]"
                    />

                    {bankPayments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeBankLine(idx)}
                        className="p-2 text-red-500 hover:bg-red-100 rounded-xl cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addBankLine}
                  className="inline-flex items-center gap-1 text-[11px] font-black text-red-600 hover:underline cursor-pointer pt-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar otro banco</span>
                </button>
              </div>

              {/* Resumen Mixto */}
              <div className="p-3 rounded-xl bg-white dark:bg-[#140505] border border-red-200 dark:border-red-950 text-xs space-y-1">
                <div className="flex justify-between font-semibold">
                  <span>Total Pedido:</span>
                  <span className="font-black text-[#450a0a] dark:text-[#fef2f2]">${cartTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-red-600 font-bold">
                  <span>Total Cubierto:</span>
                  <span>${((Number(cashAmount) || 0) + (Number(transferAmount) || 0)).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-3">
            <button
              type="button"
              onClick={() => setIsCheckoutOpen(false)}
              className="px-4 py-2.5 rounded-2xl bg-white dark:bg-[#1c0707] border border-red-200 dark:border-red-950 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-md cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Procesando...' : 'Confirmar Venta'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Ticket Venta Impreso */}
      <Modal isOpen={isReceiptOpen} onClose={() => setIsReceiptOpen(false)} title="Venta Realizada con Éxito">
        {lastOrder && (
          <div className="space-y-4">
            <div id="printable-receipt" className="p-6 bg-white border border-red-200 rounded-3xl text-center space-y-3 font-mono text-xs text-gray-800 shadow-sm">
              <div className="flex flex-col items-center justify-center border-b border-red-200 pb-3 text-center">
                <img src="/logo.png" alt="Enchiladitos Logo" className="w-14 h-14 rounded-2xl border border-red-500/50 mb-1.5 object-contain" />
                <h2 className="text-lg font-black text-red-600 uppercase tracking-wider">ENCHILADITOS</h2>
                <p className="text-[10px] text-amber-600 font-extrabold uppercase tracking-widest">Sabor, Chamoy y Fuego</p>
              </div>
              <p className="text-[10px] text-gray-500">Comprobante de Venta</p>
              <p className="text-[10px] text-gray-500 font-bold">
                {new Date(lastOrder.sale_date || lastOrder.created_at || Date.now()).toLocaleString('es-CO')}
              </p>

              <div className="text-left space-y-1 text-xs border-y border-dashed border-gray-300 py-2">
                <div><strong>Cliente:</strong> {lastOrder.customer_name}</div>
                <div><strong>Forma de Pago:</strong> {lastOrder.payment_method?.toUpperCase()} {lastOrder.bank_details ? `(${lastOrder.bank_details})` : ''}</div>
                <div><strong>Estado:</strong> Venta Registrada</div>
              </div>

              <div className="text-left space-y-1 py-1">
                {lastOrder.items && lastOrder.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-[11px]">
                    <span>{it.quantity}x {it.product?.name || it.product_name || 'Producto'}</span>
                    <span>${((it.quantity || 1) * (it.product?.price || it.unit_price || 0)).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between text-sm font-black pt-2 border-t border-red-200 text-red-600">
                <span>TOTAL FACTURADO:</span>
                <span>${(lastOrder.total || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2.5 rounded-2xl border border-red-200 text-[#450a0a] dark:text-[#fef2f2] text-xs font-bold hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Ticket</span>
              </button>
              <button
                type="button"
                onClick={() => setIsReceiptOpen(false)}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 text-white text-xs font-black shadow-md cursor-pointer"
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