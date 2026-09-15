import { useEffect, useState, useMemo } from 'react'
import { api } from '../api/client'
import Modal from '../components/Modal'
import {
  Search,
  FileText,
  Printer,
  Calendar,
  Filter,
  Trash2,
  Edit2,
  Download,
  Send,
  Plus,
  Minus,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  CreditCard,
  ShoppingBag,
  Clock,
  Package,
  BadgeAlert,
  Wallet,
  Coins,
  FileSpreadsheet,
  Flame,
  Gift,
  ChevronDown,
  MoreVertical,
  Tag
} from 'lucide-react'
import { downloadReceiptPDF, shareReceiptPDFToWhatsApp, printReceiptPDF } from '../utils/pdfReceipt'
import { exportSalesToExcel, exportSalesToCSV } from '../utils/csvExport'
import { useAuth } from '../context/AuthContext'
import MetricLineChart from '../components/MetricLineChart'

const COMMON_BANKS = ['Bre-B/Llave', 'Nequi', 'Daviplata', 'Bancolombia', 'Nu', 'Davivienda', 'BBVA', 'Banco de Bogotá']

export default function SalesHistory() {
  const { user } = useAuth()
  const isOwner = (user?.role || '').toLowerCase() === 'owner' || (user?.role || '').toLowerCase() === 'dueño'
  const isAdmin = (user?.role || '').toLowerCase() === 'admin' || (user?.role || '').toLowerCase() === 'administrador'
  const canManage = isOwner || isAdmin

  const [sales, setSales] = useState([])
  const [productsList, setProductsList] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMethod, setSelectedMethod] = useState('Todos')
  const [selectedDebtStatus, setSelectedDebtStatus] = useState('Todos') // 'Todos' | 'paid' | 'debt'
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')

  // Filtros de fecha
  const [period, setPeriod] = useState('month')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // UI Interactive States
  const [expandedSaleId, setExpandedSaleId] = useState(null)
  const [activeActionMenuId, setActiveActionMenuId] = useState(null)

  // Modal Recibo
  const [selectedSale, setSelectedSale] = useState(null)
  const [isReceiptOpen, setIsReceiptOpen] = useState(false)

  // Modal Editar Venta
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingSale, setEditingSale] = useState(null)
  const [editCustomerName, setEditCustomerName] = useState('')
  const [editPaymentMethod, setEditPaymentMethod] = useState('efectivo')
  const [editBankDetails, setEditBankDetails] = useState('')
  const [editDiscountPercent, setEditDiscountPercent] = useState(0)
  const [editDiscountAmount, setEditDiscountAmount] = useState(0)
  const [editDiscountReason, setEditDiscountReason] = useState('')
  const [editItems, setEditItems] = useState([])
  const [editDeductStock, setEditDeductStock] = useState(true)
  const [editCustomDate, setEditCustomDate] = useState('')
  const [editPaidAmount, setEditPaidAmount] = useState(0)
  const [editSubmitting, setEditSubmitting] = useState(false)

  // Cerrar menú de 3 puntos al hacer click fuera
  useEffect(() => {
    function handleClickOutside() {
      if (activeActionMenuId) {
        setActiveActionMenuId(null)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [activeActionMenuId])

  async function loadData() {
    setLoading(true)
    setPageError('')
    try {
      let queryParams = `period=${period}`
      if (period === 'custom' && startDate && endDate) {
        queryParams = `start_date=${startDate}&end_date=${endDate}`
      }

      const [salesData, prodsData] = await Promise.all([
        api.get(`/sales?${queryParams}`),
        api.get('/products').catch(() => [])
      ])

      setSales(Array.isArray(salesData) ? salesData : [])
      setProductsList(Array.isArray(prodsData) ? prodsData : [])
    } catch (err) {
      console.error('Error cargando ventas:', err)
      setPageError('Error cargando historial de ventas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()

    function handleRevalidate() {
      if (document.visibilityState === 'visible') {
        loadData()
      }
    }

    window.addEventListener('focus', handleRevalidate)
    document.addEventListener('visibilitychange', handleRevalidate)

    return () => {
      window.removeEventListener('focus', handleRevalidate)
      document.removeEventListener('visibilitychange', handleRevalidate)
    }
  }, [period, startDate, endDate])

  function openReceiptModal(sale) {
    setSelectedSale(sale)
    setIsReceiptOpen(true)
  }

  function openEditModal(sale) {
    setEditingSale(sale)
    setEditCustomerName(sale.customer_name || 'Cliente General')
    setEditPaymentMethod(sale.payment_method || 'efectivo')
    setEditBankDetails(sale.bank_details || '')
    setEditDiscountPercent(sale.discount_percent || 0)
    setEditDiscountAmount(sale.discount_amount || 0)
    setEditDiscountReason(sale.discount_reason || '')
    setEditDeductStock(sale.deducted_stock !== false)
    setEditPaidAmount(sale.paid_amount !== undefined ? sale.paid_amount : sale.total)

    const d = new Date(sale.created_at)
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    setEditCustomDate(d.toISOString().slice(0, 16))

    const mappedItems = (sale.items || []).map((it) => ({
      product_id: it.product_id,
      product_name: it.product_name,
      quantity: it.quantity,
      unit_price: it.unit_price
    }))
    setEditItems(mappedItems)
    setIsEditModalOpen(true)
  }

  function handleAddEditItem(product) {
    const existing = editItems.find((it) => it.product_id === product.id)
    if (existing) {
      setEditItems(
        editItems.map((it) =>
          it.product_id === product.id ? { ...it, quantity: it.quantity + 1 } : it
        )
      )
    } else {
      setEditItems([
        ...editItems,
        {
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          unit_price: product.price
        }
      ])
    }
  }

  function handleUpdateEditItemQty(productId, delta) {
    setEditItems(
      editItems
        .map((it) => {
          if (it.product_id === productId) {
            const nextQty = it.quantity + delta
            return nextQty > 0 ? { ...it, quantity: nextQty } : null
          }
          return it
        })
        .filter(Boolean)
    )
  }

  function handleRemoveEditItem(productId) {
    setEditItems(editItems.filter((it) => it.product_id !== productId))
  }

  const editSubtotal = useMemo(() => {
    return editItems.reduce((acc, it) => acc + (it.unit_price || 0) * it.quantity, 0)
  }, [editItems])

  const editDiscountCalculated = useMemo(() => {
    if (editDiscountPercent > 0) {
      return (editSubtotal * editDiscountPercent) / 100
    }
    return Math.min(editSubtotal, editDiscountAmount || 0)
  }, [editSubtotal, editDiscountPercent, editDiscountAmount])

  const editTotal = useMemo(() => {
    return Math.max(0, editSubtotal - editDiscountCalculated)
  }, [editSubtotal, editDiscountCalculated])

  async function handleSaveEdit(e) {
    e.preventDefault()
    if (editItems.length === 0) {
      alert('La venta debe tener al menos un producto')
      return
    }

    setEditSubmitting(true)
    try {
      const payload = {
        customer_name: editCustomerName.trim() || 'Cliente General',
        payment_method: editPaymentMethod,
        bank_details: editBankDetails,
        discount_percent: editDiscountPercent,
        discount_amount: editDiscountCalculated,
        discount_reason: editDiscountReason,
        paid_amount: editPaidAmount,
        deduct_stock: editDeductStock,
        custom_date: editCustomDate,
        items: editItems.map((it) => ({
          product_id: it.product_id,
          quantity: it.quantity,
          unit_price: it.unit_price
        }))
      }

      await api.put(`/sales/${editingSale.id}`, payload)
      setIsEditModalOpen(false)
      await loadData()
    } catch (err) {
      alert(err.message || 'Error actualizando la venta')
    } finally {
      setEditSubmitting(false)
    }
  }

  async function handleDeleteSale(sale) {
    if (!window.confirm(`¿Estás seguro de eliminar esta venta de $${Number(sale.total).toLocaleString('es-CO')}? El stock será revertido.`)) return

    try {
      await api.delete(`/sales/${sale.id}`)
      setSales((prev) => prev.filter((s) => s.id !== sale.id))
      await loadData()
    } catch (err) {
      alert(err.message || 'Error eliminando venta')
    }
  }

  // Filtrado
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        (s.customer_name || '').toLowerCase().includes(q) ||
        (s.bank_details && s.bank_details.toLowerCase().includes(q)) ||
        (s.items && s.items.some((it) => (it.product_name || '').toLowerCase().includes(q)))

      const matchesMethod = selectedMethod === 'Todos' || (s.payment_method || '').toLowerCase() === selectedMethod.toLowerCase()
      
      let matchesDebt = true
      const pending = s.pending_amount || 0
      if (selectedDebtStatus === 'paid') {
        matchesDebt = pending === 0
      } else if (selectedDebtStatus === 'debt') {
        matchesDebt = pending > 0
      }

      return matchesSearch && matchesMethod && matchesDebt
    })
  }, [sales, searchQuery, selectedMethod, selectedDebtStatus])

  // KPIs de Conciliación de Dinero
  const totalFacturado = useMemo(() => filteredSales.reduce((acc, s) => acc + (s.total || 0), 0), [filteredSales])
  const totalRecaudado = useMemo(() => filteredSales.reduce((acc, s) => acc + (s.paid_amount !== undefined ? s.paid_amount : s.total), 0), [filteredSales])
  const totalPorCobrar = useMemo(() => filteredSales.reduce((acc, s) => acc + (s.pending_amount || 0), 0), [filteredSales])
  const ticketPromedio = useMemo(() => (filteredSales.length > 0 ? Math.round(totalFacturado / filteredSales.length) : 0), [filteredSales, totalFacturado])

  const totalCollectedInCash = useMemo(() => {
    return filteredSales
      .filter((s) => s.payment_method === 'efectivo')
      .reduce((acc, s) => acc + (s.paid_amount !== undefined ? s.paid_amount : s.total), 0)
  }, [filteredSales])

  const totalCollectedTransfer = useMemo(() => {
    return filteredSales
      .filter((s) => s.payment_method === 'transferencia')
      .reduce((acc, s) => acc + (s.paid_amount !== undefined ? s.paid_amount : s.total), 0)
  }, [filteredSales])

  // Datos dinámicos para MetricLineChart
  const salesTrendData = useMemo(() => {
    const dateMap = {}
    filteredSales.forEach((s) => {
      const d = new Date(s.created_at)
      const label = d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
      if (!dateMap[label]) dateMap[label] = { label, value: 0, count: 0, date: d }
      dateMap[label].value += Number(s.total || 0)
      dateMap[label].count += 1
    })
    const sorted = Object.values(dateMap).sort((a, b) => a.date - b.date)
    return sorted.map(({ label, value }) => ({ label, value }))
  }, [filteredSales])

  const periodLabels = {
    today: 'Hoy',
    week: 'Últimos 7 Días',
    month: 'Este Mes',
    year: 'Este Año',
    all: 'Histórico Total'
  }
  const displayLabel = periodLabels[period] || 'Período Activo'

  function handleExportExcel() {
    exportSalesToExcel(filteredSales, `Ventas_Enchiladitos_${new Date().toISOString().slice(0, 10)}.xls`)
  }

  function handleExportCSV() {
    exportSalesToCSV(filteredSales, `Ventas_Enchiladitos_${new Date().toISOString().slice(0, 10)}.csv`)
  }

  return (
    <div className="space-y-6 text-[#450a0a] dark:text-[#fef2f2]">
      {/* Header Principal */}
      <div className="bg-white dark:bg-[#1a0606] border border-red-200/60 dark:border-red-950/60 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-50 dark:bg-[#200808] rounded-xl text-red-600 dark:text-amber-400 border border-red-200/60 dark:border-red-950/60">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#450a0a] dark:text-[#fef2f2]">
                Historial de Ventas
              </h1>
              <p className="text-xs text-red-900/60 dark:text-red-300/60 mt-0.5">
                Control de cobros reales, saldos pendientes a crédito, reimpresión oficial y exportación.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
          <div className="inline-flex items-center p-0.5 bg-white dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 rounded-xl shadow-xs">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-all cursor-pointer whitespace-nowrap"
              title="Descargar ventas en formato Excel (.xls)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Excel</span>
            </button>
            <div className="h-3.5 w-px bg-red-200/60 dark:border-red-950/60 mx-0.5" />
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-700 dark:text-amber-400 hover:bg-red-50 dark:hover:bg-[#2c0b0b] rounded-lg transition-all cursor-pointer whitespace-nowrap"
              title="Descargar ventas en formato CSV"
            >
              <Download className="w-3.5 h-3.5 text-red-700 dark:text-amber-400" />
              <span>CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Unified Metrics Bar — Asymmetric 2:1 Hero Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Left: Hero Metric Card with Trend Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1a0606] border border-red-200/60 dark:border-red-950/60 rounded-xl p-3.5 sm:p-4 flex flex-col justify-between shadow-xs">
          {/* Header Row: Title & Total + Badge */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-red-900/70 dark:text-red-300/70">
                <DollarSign className="w-3.5 h-3.5 opacity-70" />
                <span>Total Facturado</span>
              </div>
              <div className="mt-0.5 text-2xl sm:text-3xl font-black tracking-tight text-[#450a0a] dark:text-[#fef2f2] tabular-nums">
                ${Number(totalFacturado).toLocaleString('es-CO')}
              </div>
            </div>

            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {displayLabel}
              </span>
              <p className="text-[10px] text-red-900/60 dark:text-red-300/60 mt-1">
                Evolución de Facturación ({salesTrendData.length} registros)
              </p>
            </div>
          </div>

          {/* Center Body: Full-Width MetricLineChart */}
          <div className="my-2.5 py-1 w-full">
            <MetricLineChart
              data={salesTrendData}
              line1Color="#dc2626"
              line1Label="Facturado"
              formatValue={(v) => `$${Number(v).toLocaleString('es-CO')}`}
              height={125}
            />
          </div>

          {/* Sub-breakdown row at bottom */}
          <div className="mt-3 pt-2.5 border-t border-red-200/40 dark:border-red-950/40 grid grid-cols-3 gap-2">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-red-900/60 dark:text-red-300/60 block">
                Efectivo
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#450a0a] dark:text-[#fef2f2] tabular-nums">
                ${Number(totalCollectedInCash).toLocaleString('es-CO')}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-red-900/60 dark:text-red-300/60 block">
                Transferencias
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#450a0a] dark:text-[#fef2f2] tabular-nums">
                ${Number(totalCollectedTransfer).toLocaleString('es-CO')}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
                Por Cobrar
              </span>
              <span className="text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                ${Number(totalPorCobrar).toLocaleString('es-CO')}
              </span>
            </div>
          </div>
        </div>

        {/* Stacked Side Cards (1 col) */}
        <div className="lg:col-span-1 flex flex-col gap-2">
          <div className="bg-white dark:bg-[#1a0606] border border-red-200/60 dark:border-red-950/60 rounded-xl p-2.5 sm:p-3 flex-1 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              <span>Recaudado en Caja</span>
              <Wallet className="w-3.5 h-3.5" />
            </div>
            <div className="my-0.5 text-base sm:text-lg font-black tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
              ${Number(totalRecaudado).toLocaleString('es-CO')}
            </div>
            <span className="text-[10px] text-red-900/60 dark:text-red-300/60 font-normal">
              Efectivo y pagos liquidados
            </span>
          </div>

          <div className="bg-white dark:bg-[#1a0606] border border-red-200/60 dark:border-red-950/60 rounded-xl p-2.5 sm:p-3 flex-1 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-red-900/70 dark:text-red-300/70">
              <span>Ventas Realizadas</span>
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
            <div className="my-0.5 text-base sm:text-lg font-black tracking-tight text-[#450a0a] dark:text-[#fef2f2] tabular-nums">
              {filteredSales.length}
            </div>
            <span className="text-[10px] text-red-900/60 dark:text-red-300/60 font-normal">
              Órdenes facturadas
            </span>
          </div>

          <div className="bg-white dark:bg-[#1a0606] border border-red-200/60 dark:border-red-950/60 rounded-xl p-2.5 sm:p-3 flex-1 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-red-900/70 dark:text-red-300/70">
              <span>Ticket Promedio</span>
              <Tag className="w-3.5 h-3.5" />
            </div>
            <div className="my-0.5 text-base sm:text-lg font-black tracking-tight text-[#450a0a] dark:text-[#fef2f2] tabular-nums">
              ${Number(ticketPromedio).toLocaleString('es-CO')}
            </div>
            <span className="text-[10px] text-red-900/60 dark:text-red-300/60 font-normal">
              Promedio por transacción
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros Compacta */}
      <div className="bg-white dark:bg-[#1a0606] p-2.5 sm:p-3 rounded-2xl border border-red-200/60 dark:border-red-950/60 flex flex-col md:flex-row items-center gap-2.5 justify-between shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-red-900/40 dark:text-red-400/40" />
          <input
            type="text"
            placeholder="Buscar por cliente, banco o producto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-red-50/50 dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 text-xs font-medium text-[#450a0a] dark:text-[#fef2f2] placeholder-red-900/40 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>

        {/* Filtros Rápidos de Fecha */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-0.5 md:pb-0">
          {[
            { id: 'today', label: 'Hoy' },
            { id: 'week', label: '7 Días' },
            { id: 'month', label: 'Este Mes' },
            { id: 'year', label: 'Este Año' },
            { id: 'all', label: 'Todo' }
          ].map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                period === p.id
                  ? 'bg-red-600 text-white font-bold'
                  : 'text-red-900/70 dark:text-red-300/70 hover:bg-red-50 dark:hover:bg-[#200808]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Filtro por Estado de Deuda */}
        <select
          value={selectedDebtStatus}
          onChange={(e) => setSelectedDebtStatus(e.target.value)}
          className="px-2.5 py-1.5 rounded-xl bg-red-50/60 dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 text-xs font-medium text-[#450a0a] dark:text-[#fef2f2] cursor-pointer focus:outline-none focus:ring-1 focus:ring-red-500"
        >
          <option value="Todos">Todo Estado</option>
          <option value="paid">Pagadas Totalmente</option>
          <option value="debt">Con Saldo Pendiente</option>
        </select>

        {/* Filtro por Método de Pago */}
        <select
          value={selectedMethod}
          onChange={(e) => setSelectedMethod(e.target.value)}
          className="px-2.5 py-1.5 rounded-xl bg-red-50/60 dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 text-xs font-medium text-[#450a0a] dark:text-[#fef2f2] cursor-pointer focus:outline-none focus:ring-1 focus:ring-red-500"
        >
          <option value="Todos">Todos los Métodos</option>
          <option value="Efectivo">Efectivo</option>
          <option value="Transferencia">Transferencia</option>
          <option value="Credito">Crédito / Fiado</option>
          <option value="Mixto">Mixto</option>
        </select>
      </div>

      {/* Tabla & Acordeones de Ventas */}
      <div className="bg-white dark:bg-[#1a0606] rounded-2xl border border-red-200/60 dark:border-red-950/60 overflow-hidden shadow-xs">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-7 w-7 border-3 border-red-600 border-t-transparent" />
            <p className="text-xs font-medium text-red-900/60 dark:text-red-400/60 mt-2">Cargando ventas...</p>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="text-center py-12 p-6">
            <FileText className="w-10 h-10 mx-auto text-red-400/40 mb-2" />
            <p className="text-xs font-bold text-[#450a0a] dark:text-[#fef2f2]">No hay ventas registradas en este periodo</p>
          </div>
        ) : (
          <>
            {/* VISTA MOVIL PARA VENTAS (Acordeones Expandibles) */}
            <div className="block md:hidden divide-y divide-red-100 dark:divide-red-950/50">
              {filteredSales.map((sale) => {
                const isExpanded = expandedSaleId === sale.id
                const custName = sale.customer_name || 'Cliente General'
                const initials = custName.substring(0, 2).toUpperCase()
                const pending = sale.pending_amount || 0
                const isFullyPaid = pending === 0

                return (
                  <div key={sale.id} className="transition-colors">
                    <div
                      onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                      className="p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-red-50/40 dark:hover:bg-red-950/20 transition-colors select-none"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-[#2c0b0b] text-red-600 dark:text-amber-400 font-black text-xs flex items-center justify-center border border-red-200/60 dark:border-red-900/40 shrink-0">
                          {initials}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs text-[#450a0a] dark:text-[#fef2f2] truncate flex items-center gap-1.5">
                            <span className="truncate">{custName}</span>
                            <span className="text-[10px] text-red-900/50 dark:text-red-300/50 font-mono shrink-0">
                              #{String(sale.id).slice(-4)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium capitalize text-red-800 dark:text-amber-400">
                              <span className={`w-1.5 h-1.5 rounded-full ${isFullyPaid ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              {sale.payment_method}
                            </span>
                            <span className="text-[10px] text-red-900/50 dark:text-red-300/50 tabular-nums">
                              · {new Date(sale.created_at).toLocaleDateString('es-CO')}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span className="font-bold text-xs sm:text-sm text-[#450a0a] dark:text-[#fef2f2] tabular-nums block">
                            ${Number(sale.total).toLocaleString('es-CO')}
                          </span>
                          {!isFullyPaid && (
                            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 tabular-nums block">
                              Debe: ${Number(pending).toLocaleString('es-CO')}
                            </span>
                          )}
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 text-red-700 dark:text-red-400 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </div>

                    {/* Expandable Drawer */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 bg-red-50/30 dark:bg-[#200808]/50 border-t border-red-100 dark:border-red-950/40 space-y-3 animate-in fade-in duration-150">
                        {/* Productos Desglosados */}
                        <div className="space-y-1.5 bg-white/80 dark:bg-[#140505]/70 p-2.5 rounded-xl border border-red-200/50 dark:border-red-950/40">
                          <span className="text-[10px] uppercase font-semibold text-red-900/60 dark:text-red-300/60 block">
                            Productos Vendidos
                          </span>
                          <div className="divide-y divide-red-100/60 dark:divide-red-950/30">
                            {(sale.items || []).map((it, idx) => (
                              <div key={idx} className="py-1 flex items-center justify-between text-xs">
                                <span className="font-medium text-[#450a0a] dark:text-[#fef2f2] truncate">
                                  {it.quantity}x {it.product_name}
                                </span>
                                <span className="font-semibold text-red-900/80 dark:text-red-300/80 tabular-nums shrink-0 ml-2">
                                  ${Number((it.unit_price || 0) * it.quantity).toLocaleString('es-CO')}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Metadatos y banco */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 rounded-xl bg-white/80 dark:bg-[#140505]/70 border border-red-200/50 dark:border-red-950/40">
                            <span className="text-[10px] uppercase font-semibold text-red-900/60 dark:text-red-300/60 block">
                              Método de Pago
                            </span>
                            <span className="font-medium text-[#450a0a] dark:text-[#fef2f2] capitalize block mt-0.5">
                              {sale.payment_method}
                              {sale.bank_details ? ` (${sale.bank_details})` : ''}
                            </span>
                          </div>
                          <div className="p-2 rounded-xl bg-white/80 dark:bg-[#140505]/70 border border-red-200/50 dark:border-red-950/40">
                            <span className="text-[10px] uppercase font-semibold text-red-900/60 dark:text-red-300/60 block">
                              Estado Pago
                            </span>
                            <span className={`font-semibold block mt-0.5 ${isFullyPaid ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {isFullyPaid ? 'Cancelado Total' : `Saldo: $${Number(pending).toLocaleString('es-CO')}`}
                            </span>
                          </div>
                        </div>

                        {sale.discount_amount > 0 && (
                          <div className="p-2 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-500/20 text-xs flex justify-between">
                            <span className="text-[10px] uppercase font-semibold text-amber-800 dark:text-amber-400">
                              Descuento ({sale.discount_reason || 'Promo'})
                            </span>
                            <span className="font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                              -${Number(sale.discount_amount).toLocaleString('es-CO')}
                            </span>
                          </div>
                        )}

                        <div className="text-[10px] text-red-900/60 dark:text-red-300/50 tabular-nums">
                          Fecha exacta: {new Date(sale.created_at).toLocaleString('es-CO')}
                        </div>

                        {/* Botones de acción móviles */}
                        <div className="flex items-center gap-2 pt-2 border-t border-red-200/40 dark:border-red-950/40">
                          <button
                            type="button"
                            onClick={() => openReceiptModal(sale)}
                            className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold text-[#450a0a] dark:text-[#fef2f2] bg-white dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5 text-red-600" />
                            <span>Comprobante</span>
                          </button>

                          {canManage && (
                            <button
                              type="button"
                              onClick={() => openEditModal(sale)}
                              className="py-1.5 px-3 rounded-lg text-xs font-semibold text-red-700 dark:text-amber-400 bg-white dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Editar</span>
                            </button>
                          )}

                          {isOwner && (
                            <button
                              type="button"
                              onClick={() => handleDeleteSale(sale)}
                              className="py-1.5 px-3 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Eliminar</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* VISTA ESCRITORIO PARA VENTAS (Linear Table con Menú de 3 Puntos) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-red-50/40 dark:bg-[#200808] border-b border-red-200/60 dark:border-red-950/60 text-red-900/70 dark:text-red-300/70 uppercase font-semibold text-[11px] tracking-wider">
                  <tr>
                    <th className="px-2.5 py-2 whitespace-nowrap">Fecha & Hora</th>
                    <th className="px-2.5 py-2">Cliente & Detalle</th>
                    <th className="px-2.5 py-2 whitespace-nowrap">Método Pago</th>
                    <th className="px-2.5 py-2 text-right whitespace-nowrap">Total</th>
                    <th className="px-2.5 py-2 text-right whitespace-nowrap">Cobrado</th>
                    <th className="px-2.5 py-2 text-right whitespace-nowrap">Pendiente</th>
                    <th className="px-2.5 py-2 text-right whitespace-nowrap w-12 min-w-[48px]">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-100 dark:divide-red-950/40">
                  {filteredSales.map((sale) => {
                    const pending = sale.pending_amount || 0
                    const isFullyPaid = pending === 0
                    const paid = sale.paid_amount !== undefined ? sale.paid_amount : sale.total

                    return (
                      <tr key={sale.id} className="hover:bg-red-50/30 dark:hover:bg-red-950/20 transition-colors duration-100 group">
                        <td className="px-2.5 py-1.5 font-medium text-[#450a0a] dark:text-[#fef2f2] whitespace-nowrap text-xs">
                          <span className="tabular-nums">{new Date(sale.created_at).toLocaleDateString('es-CO')}</span>
                          <span className="text-[10px] text-red-900/60 dark:text-red-300/50 font-normal tabular-nums ml-1">
                            {new Date(sale.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td className="px-2.5 py-1.5">
                          <div className="font-semibold text-[#450a0a] dark:text-[#fef2f2] text-xs">
                            {sale.customer_name || 'Cliente General'}
                          </div>
                          <div className="text-[10px] text-red-900/60 dark:text-red-300/50 line-clamp-1">
                            {(sale.items || []).map((it) => `${it.quantity}x ${it.product_name}`).join(', ')}
                          </div>
                        </td>
                        <td className="px-2.5 py-1.5 whitespace-nowrap">
                          <span className="inline-block px-1.5 py-0.2 rounded-md bg-red-100/70 dark:bg-[#200808] text-red-800 dark:text-amber-400 text-[10px] font-semibold uppercase border border-red-200/50 dark:border-red-950/40">
                            {sale.payment_method}
                            {sale.bank_details ? ` · ${sale.bank_details}` : ''}
                          </span>
                        </td>
                        <td className="px-2.5 py-1.5 font-bold text-[#450a0a] dark:text-[#fef2f2] text-xs text-right tabular-nums whitespace-nowrap">
                          ${Number(sale.total).toLocaleString('es-CO')}
                        </td>
                        <td className="px-2.5 py-1.5 font-semibold text-emerald-600 dark:text-emerald-400 text-xs text-right tabular-nums whitespace-nowrap">
                          ${Number(paid).toLocaleString('es-CO')}
                        </td>
                        <td className="px-2.5 py-1.5 text-xs text-right tabular-nums whitespace-nowrap">
                          {isFullyPaid ? (
                            <span className="text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold">Al día</span>
                          ) : (
                            <span className="font-bold text-rose-600 dark:text-rose-400">
                              ${Number(pending).toLocaleString('es-CO')}
                            </span>
                          )}
                        </td>

                        {/* Menú de 3 Puntos */}
                        <td className="px-2.5 py-1.5 text-right whitespace-nowrap w-12 min-w-[48px]">
                          <div className="flex items-center justify-end">
                            <div className="relative inline-block text-left">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setActiveActionMenuId(activeActionMenuId === sale.id ? null : sale.id)
                                }}
                                title="Más opciones"
                                className={`p-1 rounded-md text-red-700 dark:text-amber-400 hover:text-[#450a0a] dark:hover:text-white hover:bg-red-100 dark:hover:bg-[#2c0b0b] transition-colors cursor-pointer ${
                                  activeActionMenuId === sale.id ? 'bg-red-100 dark:bg-[#2c0b0b] text-[#450a0a] dark:text-white' : ''
                                }`}
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>

                              {/* Dropdown flotante */}
                              {activeActionMenuId === sale.id && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-[#1a0606] border border-red-200/60 dark:border-red-950/60 rounded-xl shadow-lg py-1 z-50 text-left animate-in fade-in duration-100"
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionMenuId(null)
                                      openReceiptModal(sale)
                                    }}
                                    className="w-full px-3 py-2 text-xs font-medium text-[#450a0a] dark:text-[#fef2f2] hover:bg-red-50 dark:hover:bg-[#200808] flex items-center gap-2.5 cursor-pointer transition-colors"
                                  >
                                    <Printer className="w-3.5 h-3.5 text-red-600 shrink-0" />
                                    <span>Ver Comprobante</span>
                                  </button>

                                  {canManage && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveActionMenuId(null)
                                        openEditModal(sale)
                                      }}
                                      className="w-full px-3 py-2 text-xs font-medium text-[#450a0a] dark:text-[#fef2f2] hover:bg-red-50 dark:hover:bg-[#200808] flex items-center gap-2.5 cursor-pointer transition-colors"
                                    >
                                      <Edit2 className="w-3.5 h-3.5 text-red-600 shrink-0" />
                                      <span>Editar Venta</span>
                                    </button>
                                  )}

                                  {isOwner && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveActionMenuId(null)
                                        handleDeleteSale(sale)
                                      }}
                                      className="w-full px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 cursor-pointer transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                      <span>Eliminar Venta</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal Editar Venta */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar Venta Registrada"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-red-900/70 dark:text-red-300/70 mb-1">
                Cliente
              </label>
              <input
                type="text"
                required
                value={editCustomerName}
                onChange={(e) => setEditCustomerName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-red-50/50 dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-red-900/70 dark:text-red-300/70 mb-1">
                Método de Pago
              </label>
              <select
                value={editPaymentMethod}
                onChange={(e) => setEditPaymentMethod(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-red-50/50 dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 text-xs font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="credito">Crédito / Fiado</option>
                <option value="mixto">Mixto</option>
              </select>
            </div>
          </div>

          {/* Desglose de montos pagados y pendientes */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-red-50/40 dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60">
            <div>
              <label className="block text-[10px] font-semibold uppercase text-emerald-700 dark:text-emerald-400 mb-1">
                Monto Cobrado / Abonado ($)
              </label>
              <input
                type="number"
                min="0"
                max={editTotal}
                value={editPaidAmount}
                onChange={(e) => setEditPaidAmount(Number(e.target.value))}
                className="w-full px-2.5 py-1 rounded-lg bg-white dark:bg-[#140505] border border-emerald-300/60 dark:border-emerald-900/40 text-xs font-semibold focus:outline-none tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase text-rose-700 dark:text-rose-400 mb-1">
                Saldo Pendiente ($)
              </label>
              <div className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#140505] border border-rose-300/60 dark:border-rose-900/40 text-xs font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                ${Math.max(0, editTotal - editPaidAmount).toLocaleString('es-CO')}
              </div>
            </div>
          </div>

          {/* Items de la venta */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase text-red-900/70 dark:text-red-300/70">
              Productos de la Venta
            </label>
            <div className="max-h-40 overflow-y-auto space-y-1.5 border border-red-200/60 dark:border-red-950/60 p-2 rounded-xl bg-white/50 dark:bg-[#140505]">
              {editItems.map((it) => (
                <div key={it.product_id} className="flex items-center justify-between p-1.5 rounded-lg bg-red-50/50 dark:bg-[#200808] text-xs">
                  <span className="truncate flex-1 font-medium">{it.product_name}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateEditItemQty(it.product_id, -1)}
                      className="p-1 rounded-md text-red-600 hover:bg-red-100 dark:hover:bg-[#2c0b0b] cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="tabular-nums font-semibold">{it.quantity}</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateEditItemQty(it.product_id, 1)}
                      className="p-1 rounded-md text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <span className="w-16 text-right font-bold tabular-nums">
                      ${(it.unit_price * it.quantity).toLocaleString('es-CO')}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveEditItem(it.product_id)}
                      className="p-1 text-red-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totales de Edición */}
          <div className="space-y-1 text-right text-xs font-medium pt-2 border-t border-red-200/40 dark:border-red-950/40">
            <div className="flex justify-between text-red-900/60 dark:text-red-300/60">
              <span>Subtotal:</span>
              <span className="tabular-nums font-mono">${editSubtotal.toLocaleString('es-CO')}</span>
            </div>
            <div className="flex justify-between font-bold text-sm text-red-600 dark:text-amber-400">
              <span>Total Nuevo:</span>
              <span className="tabular-nums font-mono">${editTotal.toLocaleString('es-CO')}</span>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-between pt-3 border-t border-red-200/40 dark:border-red-950/40">
            {isOwner ? (
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false)
                  handleDeleteSale(editingSale)
                }}
                className="px-3.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold text-xs hover:bg-rose-100 cursor-pointer flex items-center gap-1.5 border border-rose-200/60 dark:border-rose-900/40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar Venta</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold text-red-900/70 dark:text-red-300/70 hover:bg-red-100/60 dark:hover:bg-[#2c0b0b] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={editSubmitting}
                className="px-5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-semibold text-xs shadow-xs cursor-pointer disabled:opacity-50"
              >
                {editSubmitting ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Modal Ver Recibo */}
      <Modal isOpen={isReceiptOpen} onClose={() => setIsReceiptOpen(false)} title="Recibo de Venta">
        {selectedSale && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white border border-red-200 text-black space-y-3 font-mono text-xs shadow-xs">
              <div className="text-center pb-2 border-b border-gray-200">
                <img src="/logo.png" alt="Enchiladitos Logo" className="w-12 h-12 mx-auto mb-2 object-contain rounded-xl shadow-xs" />
                <p className="text-[11px] font-bold text-red-700">Sabor, Chamoy y Fuego</p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {new Date(selectedSale.created_at).toLocaleString('es-CO')}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold">Cliente: {selectedSale.customer_name || 'Cliente General'}</p>
                <p className="text-[10px] text-gray-500">
                  Pago: {(selectedSale.payment_method || '').toUpperCase()}
                  {selectedSale.pending_amount > 0 && ` (Saldo Pendiente: $${Number(selectedSale.pending_amount).toLocaleString('es-CO')})`}
                </p>
              </div>

              <div className="space-y-1 py-2 border-y border-gray-200">
                {(selectedSale.items || []).map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>
                      {it.quantity}x {it.product_name}
                    </span>
                    <span className="tabular-nums">${Number((it.unit_price || 0) * it.quantity).toLocaleString('es-CO')}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-right">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span className="tabular-nums">${Number(selectedSale.subtotal || selectedSale.total).toLocaleString('es-CO')}</span>
                </div>
                {selectedSale.stamp_reward_redeemed && (
                  <div className="flex justify-between text-amber-600 font-bold">
                    <span>Recompensa Fidelidad:</span>
                    <span>50% OFF (7 Sellos Canjeados)</span>
                  </div>
                )}
                {selectedSale.discount_amount > 0 && (
                  <div className="flex justify-between text-red-600 font-bold">
                    <span>Descuento ({selectedSale.discount_reason || 'Promo'}):</span>
                    <span className="tabular-nums">-${Number(selectedSale.discount_amount).toLocaleString('es-CO')}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-gray-200">
                  <span>TOTAL:</span>
                  <span className="tabular-nums">${Number(selectedSale.total).toLocaleString('es-CO')}</span>
                </div>

                {selectedSale.pending_amount > 0 && (
                  <>
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Abonado / Pagado:</span>
                      <span className="tabular-nums">${Number(selectedSale.paid_amount || 0).toLocaleString('es-CO')}</span>
                    </div>
                    <div className="flex justify-between text-rose-600 font-bold">
                      <span>SALDO PENDIENTE:</span>
                      <span className="tabular-nums">${Number(selectedSale.pending_amount).toLocaleString('es-CO')}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
              <button
                type="button"
                onClick={() => downloadReceiptPDF(selectedSale)}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-xs cursor-pointer transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>Descargar PDF</span>
              </button>

              <button
                type="button"
                onClick={() => shareReceiptPDFToWhatsApp(selectedSale)}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs cursor-pointer transition-colors shadow-xs whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5 shrink-0" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => printReceiptPDF(selectedSale)}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold text-xs cursor-pointer transition-colors whitespace-nowrap"
              >
                <Printer className="w-3.5 h-3.5 shrink-0" />
                <span>Imprimir</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
