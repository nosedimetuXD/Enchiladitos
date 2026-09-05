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
  FileSpreadsheet
} from 'lucide-react'
import { downloadReceiptPDF, shareReceiptPDFToWhatsApp, printReceiptPDF } from '../utils/pdfReceipt'
import { exportSalesToExcel, exportSalesToCSV } from '../utils/csvExport'

const COMMON_BANKS = ['Bre-B/Llave', 'Nequi', 'Daviplata', 'Bancolombia', 'Nu', 'Davivienda', 'BBVA', 'Banco de Bogotá']

export default function SalesHistory() {
  const [sales, setSales] = useState([])
  const [productsList, setProductsList] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMethod, setSelectedMethod] = useState('Todos')
  const [selectedDebtStatus, setSelectedDebtStatus] = useState('Todos') // 'Todos' | 'paid' | 'debt'
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')

  // Filtros de fecha
  const [period, setPeriod] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

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

  // Cálculos de edición
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
        s.customer_name.toLowerCase().includes(q) ||
        (s.bank_details && s.bank_details.toLowerCase().includes(q)) ||
        (s.items && s.items.some((it) => it.product_name.toLowerCase().includes(q)))

      const matchesMethod = selectedMethod === 'Todos' || s.payment_method === selectedMethod.toLowerCase()
      
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
  const ticketPromedio = useMemo(() => (filteredSales.length > 0 ? totalFacturado / filteredSales.length : 0), [filteredSales, totalFacturado])

  // Exportacion de Ventas (Excel & CSV)
  function handleExportExcel() {
    exportSalesToExcel(filteredSales, `Ventas_Enchiladitos_${new Date().toISOString().slice(0, 10)}.xls`)
  }

  function handleExportCSV() {
    exportSalesToCSV(filteredSales, `Ventas_Enchiladitos_${new Date().toISOString().slice(0, 10)}.csv`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#1c0707] p-6 rounded-3xl border border-red-200/80 dark:border-red-950/60 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-red-100 dark:bg-red-950 text-red-600 dark:text-amber-400">
              <FileText className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-[#450a0a] dark:text-[#fef2f2]">
              Historial de Ventas
            </h1>
          </div>
          <p className="text-sm font-medium text-red-900/60 dark:text-red-300/60 mt-1">
            Control de cobros reales, saldos pendientes a crédito, reimpresión oficial y exportación.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-[#200808] border border-red-200 dark:border-red-950 text-emerald-700 dark:text-emerald-400 font-bold text-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer shadow-xs"
            title="Descargar ventas en formato Excel (.xls)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Exportar Excel</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-[#200808] border border-red-200 dark:border-red-950 text-red-700 dark:text-amber-400 font-bold text-xs hover:bg-red-50 cursor-pointer shadow-xs"
            title="Descargar ventas en formato CSV"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards de Conciliación de Caja */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#1c0707] p-5 rounded-3xl border border-red-200/70 dark:border-red-950/60 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950 text-red-600 dark:text-amber-400">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-900/60 dark:text-red-300/60">
              Total Facturado
            </span>
            <h3 className="text-xl font-black text-[#450a0a] dark:text-[#fef2f2]">
              ${totalFacturado.toLocaleString('es-CO')}
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1c0707] p-5 rounded-3xl border border-emerald-200/70 dark:border-emerald-950/60 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800/70 dark:text-emerald-300/70">
              Recaudado en Caja
            </span>
            <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              ${totalRecaudado.toLocaleString('es-CO')}
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1c0707] p-5 rounded-3xl border border-rose-200/70 dark:border-rose-950/60 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-900/70 dark:text-rose-300/70">
              Por Cobrar (Deuda)
            </span>
            <h3 className="text-xl font-black text-rose-600 dark:text-rose-400">
              ${totalPorCobrar.toLocaleString('es-CO')}
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1c0707] p-5 rounded-3xl border border-amber-200/70 dark:border-amber-950/60 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900/60 dark:text-amber-300/60">
              Ventas Realizadas
            </span>
            <h3 className="text-xl font-black text-[#450a0a] dark:text-[#fef2f2]">
              {filteredSales.length}
            </h3>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white dark:bg-[#1c0707] p-4 rounded-3xl border border-red-200/80 dark:border-red-950/60 flex flex-col md:flex-row items-center gap-3 justify-between shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-red-900/40 dark:text-red-400/40" />
          <input
            type="text"
            placeholder="Buscar por cliente, banco o producto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] placeholder-red-900/40 focus:outline-none"
          />
        </div>

        {/* Filtros Rápidos de Fecha */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: 'today', label: 'Hoy' },
            { id: 'week', label: '7 Días' },
            { id: 'month', label: 'Este Mes' },
            { id: 'year', label: 'Este Año' },
            { id: 'all', label: 'Todo' }
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-black whitespace-nowrap cursor-pointer transition-all ${
                period === p.id
                  ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-xs'
                  : 'bg-red-50/70 dark:bg-[#200808] text-red-950/70 dark:text-red-200/70 hover:bg-red-100/70'
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
          className="px-3.5 py-2.5 rounded-2xl bg-red-50/70 dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 text-xs font-bold text-red-950 dark:text-red-100 cursor-pointer"
        >
          <option value="Todos">Todo Estado</option>
          <option value="paid">Pagadas Totalmente</option>
          <option value="debt">Con Saldo Pendiente</option>
        </select>

        {/* Filtro por Método de Pago */}
        <select
          value={selectedMethod}
          onChange={(e) => setSelectedMethod(e.target.value)}
          className="px-3.5 py-2.5 rounded-2xl bg-red-50/70 dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 text-xs font-bold text-red-950 dark:text-red-100 cursor-pointer"
        >
          <option value="Todos">Todos los Métodos</option>
          <option value="Efectivo">Efectivo</option>
          <option value="Transferencia">Transferencia</option>
          <option value="Credito">Crédito / Fiado</option>
          <option value="Mixto">Mixto</option>
        </select>
      </div>

      {/* Tabla de Ventas */}
      <div className="bg-white dark:bg-[#1c0707] rounded-3xl border border-red-200/80 dark:border-red-950/60 overflow-hidden shadow-xs">
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-600 border-t-transparent"></div>
            <p className="text-xs font-bold text-red-900/60 dark:text-red-400/60 mt-3">Cargando ventas...</p>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="text-center py-16 p-6">
            <FileText className="w-12 h-12 mx-auto text-red-400/40 mb-3" />
            <p className="text-base font-black text-[#450a0a] dark:text-[#fef2f2]">No hay ventas registradas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-red-200/60 dark:border-red-950/60 bg-red-50/40 dark:bg-[#200808] text-red-950/70 dark:text-red-300/70 font-black uppercase text-[10px] tracking-wider">
                  <th className="p-4 whitespace-nowrap">Fecha & Hora</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Productos</th>
                  <th className="p-4 whitespace-nowrap">Pago / Estado</th>
                  <th className="p-4 text-right whitespace-nowrap">Total</th>
                  <th className="p-4 text-right whitespace-nowrap">Cobrado</th>
                  <th className="p-4 text-right whitespace-nowrap">Pendiente</th>
                  <th className="p-4 text-center w-28 whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100 dark:divide-red-950/50">
                {filteredSales.map((s) => {
                  const paid = s.paid_amount !== undefined ? s.paid_amount : s.total
                  const pending = s.pending_amount || 0
                  const isFullyPaid = pending === 0
                  const isPartial = paid > 0 && pending > 0
                  const isFullDebt = paid === 0 && pending > 0
                  const itemsList = (s.items || []).map((it) => `${it.quantity}x ${it.product_name}`).join(', ')

                  return (
                    <tr key={s.id} className="hover:bg-red-50/30 dark:hover:bg-red-950/20 transition-colors">
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-black text-xs text-[#450a0a] dark:text-[#fef2f2]">
                            {new Date(s.created_at).toLocaleDateString('es-CO', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                          <span className="font-bold text-[11px] text-red-900/60 dark:text-red-300/60">
                            {new Date(s.created_at).toLocaleTimeString('es-CO', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Cliente con tooltip y truncate */}
                      <td className="p-4 font-black text-[#450a0a] dark:text-[#fef2f2] max-w-[140px] truncate" title={s.customer_name}>
                        {s.customer_name}
                      </td>

                      {/* Productos con tooltip y truncate */}
                      <td className="p-4 max-w-[200px] truncate font-medium text-red-950/70 dark:text-red-200/70" title={itemsList}>
                        {itemsList || 'Sin detalle'}
                      </td>

                      {/* Método de Pago y Estado */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-black uppercase text-gray-700 dark:text-gray-300">
                            {s.payment_method}
                          </span>
                          {isFullyPaid && (
                            <span className="w-fit px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                              Pagado
                            </span>
                          )}
                          {isPartial && (
                            <span className="w-fit px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                              Abono Parcial
                            </span>
                          )}
                          {isFullDebt && (
                            <span className="w-fit px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400">
                              Crédito
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Total Facturado */}
                      <td className="p-4 text-right font-black text-[#450a0a] dark:text-[#fef2f2] whitespace-nowrap">
                        ${s.total.toLocaleString('es-CO')}
                      </td>

                      {/* Cobrado Real */}
                      <td className="p-4 text-right font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        ${paid.toLocaleString('es-CO')}
                      </td>

                      {/* Pendiente */}
                      <td className="p-4 text-right whitespace-nowrap">
                        {pending > 0 ? (
                          <span className="font-black text-rose-600 dark:text-rose-400">
                            ${pending.toLocaleString('es-CO')}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-bold">$0</span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="p-4 text-center w-28 whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openReceiptModal(s)}
                            className="p-1.5 rounded-xl text-red-600 dark:text-amber-400 hover:bg-red-100 dark:hover:bg-red-950 transition-colors cursor-pointer"
                            title="Ver Recibo / Imprimir"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(s)}
                            className="p-1.5 rounded-xl text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors cursor-pointer"
                            title="Editar Venta"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSale(s)}
                            className="p-1.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950 transition-colors cursor-pointer"
                            title="Eliminar Venta"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Editar Venta */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Modificar Venta">
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-red-950 dark:text-red-200 mb-1">
                Cliente *
              </label>
              <input
                type="text"
                required
                value={editCustomerName}
                onChange={(e) => setEditCustomerName(e.target.value)}
                className="w-full px-4 py-2 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200 text-xs font-bold focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-red-950 dark:text-red-200 mb-1">
                Método de Pago
              </label>
              <select
                value={editPaymentMethod}
                onChange={(e) => setEditPaymentMethod(e.target.value)}
                className="w-full px-4 py-2 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200 text-xs font-bold focus:outline-none"
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="credito">Crédito / Fiado</option>
                <option value="mixto">Mixto</option>
              </select>
            </div>
          </div>

          {/* Desglose de montos pagados y pendientes */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-red-50/40 dark:bg-[#200808] border border-red-200 dark:border-red-950">
            <div>
              <label className="block text-[11px] font-black uppercase text-emerald-700 dark:text-emerald-400 mb-1">
                Monto Cobrado / Abonado ($)
              </label>
              <input
                type="number"
                min="0"
                max={editTotal}
                value={editPaidAmount}
                onChange={(e) => setEditPaidAmount(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-[#140505] border border-emerald-300 text-xs font-bold focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase text-rose-700 dark:text-rose-400 mb-1">
                Saldo Pendiente ($)
              </label>
              <div className="px-3 py-2 rounded-xl bg-white dark:bg-[#140505] border border-rose-300 text-xs font-black text-rose-600">
                ${Math.max(0, editTotal - editPaidAmount).toLocaleString('es-CO')}
              </div>
            </div>
          </div>

          {/* Items de la venta */}
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase text-red-950 dark:text-red-200">
              Productos de la Venta
            </label>
            <div className="max-h-40 overflow-y-auto space-y-2 border border-red-100 dark:border-red-950 p-2 rounded-2xl">
              {editItems.map((it) => (
                <div key={it.product_id} className="flex items-center justify-between p-2 rounded-xl bg-red-50/50 dark:bg-[#200808] text-xs font-bold">
                  <span className="truncate flex-1">{it.product_name}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateEditItemQty(it.product_id, -1)}
                      className="p-1 rounded-lg text-red-600 hover:bg-red-100"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span>{it.quantity}</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateEditItemQty(it.product_id, 1)}
                      className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-100"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <span className="w-16 text-right font-black">
                      ${(it.unit_price * it.quantity).toLocaleString('es-CO')}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveEditItem(it.product_id)}
                      className="p-1 text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totales de Edición */}
          <div className="space-y-1 text-right text-xs font-bold pt-2 border-t border-red-100 dark:border-red-950">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal:</span>
              <span>${editSubtotal.toLocaleString('es-CO')}</span>
            </div>
            <div className="flex justify-between font-black text-sm text-red-600 dark:text-amber-400">
              <span>Total Nuevo:</span>
              <span>${editTotal.toLocaleString('es-CO')}</span>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-between pt-3 border-t border-red-100 dark:border-red-950">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false)
                handleDeleteSale(editingSale)
              }}
              className="px-4 py-2.5 rounded-2xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 font-black text-xs hover:bg-red-100 cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>Eliminar Venta</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-5 py-2.5 rounded-2xl text-xs font-bold text-red-950/70 hover:bg-red-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={editSubmitting}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 text-white font-black text-xs shadow-md cursor-pointer disabled:opacity-50"
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
            <div className="p-5 rounded-3xl bg-white border-2 border-dashed border-red-200 text-black space-y-3 font-mono text-xs">
              <div className="text-center pb-2 border-b border-gray-200">
                <img src="/logo.png" alt="Enchiladitos Logo" className="w-14 h-14 mx-auto mb-2.5 object-contain rounded-2xl shadow-xs" />
                <p className="text-[11px] font-black text-red-700">Sabor, Chamoy y Fuego</p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {new Date(selectedSale.created_at).toLocaleString('es-CO')}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold">Cliente: {selectedSale.customer_name}</p>
                <p className="text-[10px] text-gray-500">
                  Pago: {selectedSale.payment_method.toUpperCase()}
                  {selectedSale.pending_amount > 0 && ` (Saldo Pendiente: $${selectedSale.pending_amount.toLocaleString('es-CO')})`}
                </p>
              </div>

              <div className="space-y-1 py-2 border-y border-gray-200">
                {(selectedSale.items || []).map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>
                      {it.quantity}x {it.product_name}
                    </span>
                    <span>${(it.unit_price * it.quantity).toLocaleString('es-CO')}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-right">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span>${(selectedSale.subtotal || selectedSale.total).toLocaleString('es-CO')}</span>
                </div>
                {selectedSale.discount_amount > 0 && (
                  <div className="flex justify-between text-red-600 font-bold">
                    <span>Descuento ({selectedSale.discount_reason || 'Promo'}):</span>
                    <span>-${selectedSale.discount_amount.toLocaleString('es-CO')}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm pt-1 border-t border-gray-200">
                  <span>TOTAL:</span>
                  <span>${selectedSale.total.toLocaleString('es-CO')}</span>
                </div>

                {selectedSale.pending_amount > 0 && (
                  <>
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Abonado / Pagado:</span>
                      <span>${Number(selectedSale.paid_amount || 0).toLocaleString('es-CO')}</span>
                    </div>
                    <div className="flex justify-between text-rose-600 font-black">
                      <span>SALDO PENDIENTE:</span>
                      <span>${selectedSale.pending_amount.toLocaleString('es-CO')}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
              <button
                onClick={() => downloadReceiptPDF(selectedSale)}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs cursor-pointer transition-colors whitespace-nowrap"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>Descargar PDF</span>
              </button>

              <button
                onClick={() => shareReceiptPDFToWhatsApp(selectedSale)}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs cursor-pointer transition-colors shadow-md whitespace-nowrap"
              >
                <Send className="w-4 h-4 shrink-0" />
                <span>WhatsApp</span>
              </button>

              <button
                onClick={() => printReceiptPDF(selectedSale)}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs cursor-pointer transition-colors whitespace-nowrap"
              >
                <Printer className="w-4 h-4 shrink-0" />
                <span>Imprimir</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
