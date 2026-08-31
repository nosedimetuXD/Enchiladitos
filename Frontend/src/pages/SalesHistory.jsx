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
  Package
} from 'lucide-react'
import { downloadReceiptPDF, shareReceiptPDFToWhatsApp, printReceiptPDF } from '../utils/pdfReceipt'

const COMMON_BANKS = ['Bre-B/Llave', 'Nequi', 'Daviplata', 'Bancolombia', 'Nu', 'Davivienda', 'BBVA', 'Banco de Bogotá']

export default function SalesHistory() {
  const [sales, setSales] = useState([])
  const [productsList, setProductsList] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMethod, setSelectedMethod] = useState('Todos')
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
  const [editDate, setEditDate] = useState('')
  const [editDiscountPercent, setEditDiscountPercent] = useState(0)
  const [editDiscountReason, setEditDiscountReason] = useState('')
  const [editDeductStock, setEditDeductStock] = useState(true)
  const [editItems, setEditItems] = useState([])
  const [editSubmitting, setEditSubmitting] = useState(false)

  async function loadData() {
    setLoading(true)
    setPageError('')
    try {
      let queryStr = ''
      if (startDate && endDate) {
        queryStr = `start_date=${startDate}&end_date=${endDate}`
      } else {
        queryStr = `period=${period}`
      }

      const [salesData, prodsData] = await Promise.all([
        api.get(`/sales?${queryStr}`),
        api.get('/products').catch(() => [])
      ])
      setSales(salesData || [])
      setProductsList(prodsData || [])
    } catch (err) {
      setPageError('No se pudo cargar el historial de ventas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
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
    setEditDiscountReason(sale.discount_reason || '')
    setEditDeductStock(sale.deducted_stock ?? true)

    const d = new Date(sale.created_at)
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    setEditDate(d.toISOString().slice(0, 16))

    setEditItems((sale.items || []).map((it) => ({
      product_id: it.product_id,
      product_name: it.product_name,
      quantity: it.quantity,
      unit_price: it.unit_price
    })))

    setIsEditModalOpen(true)
  }

  function handleEditQuantity(productId, delta) {
    setEditItems((prev) =>
      prev
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

  function handleAddProductToEdit(product) {
    setEditItems((prev) => {
      const existing = prev.find((it) => it.product_id === product.id)
      if (existing) {
        return prev.map((it) => (it.product_id === product.id ? { ...it, quantity: it.quantity + 1 } : it))
      }
      return [...prev, { product_id: product.id, product_name: product.name, quantity: 1, unit_price: product.price }]
    })
  }

  const editSubtotal = useMemo(() => {
    return editItems.reduce((acc, it) => acc + (it.unit_price || 0) * (it.quantity || 0), 0)
  }, [editItems])

  const editDiscountAmount = useMemo(() => {
    const p = Number(editDiscountPercent) || 0
    return (editSubtotal * p) / 100
  }, [editSubtotal, editDiscountPercent])

  const editTotal = useMemo(() => {
    return Math.max(0, editSubtotal - editDiscountAmount)
  }, [editSubtotal, editDiscountAmount])

  async function handleSaveEdit(e) {
    e.preventDefault()
    if (!editingSale || editItems.length === 0) return
    setEditSubmitting(true)
    try {
      const payload = {
        customer_name: editCustomerName.trim() || 'Cliente General',
        payment_method: editPaymentMethod,
        cash_amount: editPaymentMethod === 'efectivo' ? editTotal : 0,
        transfer_amount: editPaymentMethod === 'transferencia' ? editTotal : 0,
        bank_details: editBankDetails.trim(),
        discount_percent: Number(editDiscountPercent) || 0,
        discount_amount: editDiscountAmount,
        discount_reason: editDiscountReason.trim(),
        deduct_stock: editDeductStock,
        custom_date: editDate,
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
      return matchesSearch && matchesMethod
    })
  }, [sales, searchQuery, selectedMethod])

  // KPIs
  const totalFacturado = useMemo(() => filteredSales.reduce((acc, s) => acc + (s.total || 0), 0), [filteredSales])
  const totalDescuentos = useMemo(() => filteredSales.reduce((acc, s) => acc + (s.discount_amount || 0), 0), [filteredSales])
  const ticketPromedio = useMemo(() => (filteredSales.length > 0 ? totalFacturado / filteredSales.length : 0), [filteredSales, totalFacturado])

  // Exportar a CSV (Inspirado en Twenty)
  function exportToCSV() {
    if (filteredSales.length === 0) return
    let csv = 'ID,Fecha,Cliente,Productos,Subtotal,Descuento,Total,Metodo,Detalles\n'
    filteredSales.forEach((s) => {
      const itemsStr = (s.items || []).map((it) => `${it.quantity}x ${it.product_name}`).join('; ')
      const dateStr = new Date(s.created_at).toLocaleString('es-CO').replace(',', '')
      csv += `"${s.id}","${dateStr}","${s.customer_name}","${itemsStr}",${s.subtotal || s.total},${s.discount_amount || 0},${s.total},"${s.payment_method}","${s.bank_details || ''}"\n`
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `Ventas_Enchiladitos_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function handleSendWhatsApp(sale) {
    shareReceiptPDFToWhatsApp(sale)
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
            Consulta, edita o cancela ventas históricas, reimprime recibos y exporta a Excel/CSV.
          </p>
        </div>

        <button
          onClick={exportToCSV}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white dark:bg-[#200808] border border-red-200 dark:border-red-950 hover:bg-red-50 text-red-700 dark:text-amber-400 font-bold text-xs shadow-xs cursor-pointer transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Exportar a CSV</span>
        </button>
      </div>

      {/* Tarjetas KPIs del Periodo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#1c0707] p-5 rounded-3xl border border-red-200/60 dark:border-red-950/60 flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-amber-400">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase text-red-900/50 dark:text-red-400/50">Total Facturado</span>
            <p className="text-2xl font-black text-red-600 dark:text-amber-400">
              ${totalFacturado.toLocaleString('es-CO')}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1c0707] p-5 rounded-3xl border border-red-200/60 dark:border-red-950/60 flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase text-red-900/50 dark:text-red-400/50">Ventas Realizadas</span>
            <p className="text-2xl font-black text-[#450a0a] dark:text-[#fef2f2]">{filteredSales.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1c0707] p-5 rounded-3xl border border-red-200/60 dark:border-red-950/60 flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase text-red-900/50 dark:text-red-400/50">Ticket Promedio</span>
            <p className="text-2xl font-black text-[#450a0a] dark:text-[#fef2f2]">
              ${ticketPromedio.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col md:flex-row items-center gap-3 bg-white dark:bg-[#1c0707] p-4 rounded-3xl border border-red-200/70 dark:border-red-950/60">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-red-900/40 dark:text-red-400/40" />
          <input
            type="text"
            placeholder="Buscar por cliente, banco o producto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* Botones de Periodo Rápido */}
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
              onClick={() => {
                setPeriod(p.id)
                setStartDate('')
                setEndDate('')
              }}
              className={`px-3 py-2 rounded-2xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                period === p.id && !startDate
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-red-50/70 dark:bg-[#200808] text-red-950/70 dark:text-red-200/70 hover:bg-red-100/70'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Filtro por Método de Pago */}
        <select
          value={selectedMethod}
          onChange={(e) => setSelectedMethod(e.target.value)}
          className="px-3.5 py-2.5 rounded-2xl bg-red-50/70 dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 text-xs font-bold text-red-950 dark:text-red-100 cursor-pointer"
        >
          <option value="Todos">💳 Todos los Métodos</option>
          <option value="Efectivo">💵 Efectivo</option>
          <option value="Transferencia">📱 Transferencia</option>
          <option value="Mixto">🔄 Mixto</option>
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
                  <th className="p-4">Fecha & Hora</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Productos</th>
                  <th className="p-4">Pago</th>
                  <th className="p-4 text-right">Subtotal</th>
                  <th className="p-4 text-right">Descuento</th>
                  <th className="p-4 text-right">Total</th>
                  <th className="p-4 text-center w-32">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100 dark:divide-red-950/50">
                {filteredSales.map((s) => (
                  <tr key={s.id} className="hover:bg-red-50/30 dark:hover:bg-red-950/20 transition-colors">
                    <td className="p-4 font-bold text-[#450a0a] dark:text-[#fef2f2] whitespace-nowrap">
                      {new Date(s.created_at).toLocaleString('es-CO', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="p-4 font-black text-[#450a0a] dark:text-[#fef2f2]">{s.customer_name}</td>
                    <td className="p-4 max-w-xs truncate font-medium text-red-950/70 dark:text-red-200/70">
                      {(s.items || []).map((it) => `${it.quantity}x ${it.product_name}`).join(', ')}
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-xl bg-red-100/70 dark:bg-red-950 text-red-700 dark:text-amber-400 font-extrabold uppercase text-[10px]">
                        {s.payment_method}
                      </span>
                      {s.bank_details && (
                        <p className="text-[10px] text-gray-500 mt-0.5 truncate max-w-[120px]">{s.bank_details}</p>
                      )}
                    </td>
                    <td className="p-4 text-right font-medium text-gray-500">
                      ${(s.subtotal || s.total).toLocaleString('es-CO')}
                    </td>
                    <td className="p-4 text-right font-bold text-amber-600 dark:text-amber-400">
                      {s.discount_amount > 0 ? `-$${s.discount_amount.toLocaleString('es-CO')}` : '-'}
                    </td>
                    <td className="p-4 text-right font-black text-red-600 dark:text-amber-400 text-sm">
                      ${s.total.toLocaleString('es-CO')}
                    </td>
                    <td className="p-4 text-center w-32 whitespace-nowrap">
                      <div className="inline-flex items-center justify-center gap-2">
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
                ))}
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
                Fecha & Hora
              </label>
              <input
                type="datetime-local"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full px-4 py-2 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200 text-xs font-bold focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-red-950 dark:text-red-200 mb-1">
                Método de Pago
              </label>
              <select
                value={editPaymentMethod}
                onChange={(e) => setEditPaymentMethod(e.target.value)}
                className="w-full px-4 py-2 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200 text-xs font-bold cursor-pointer"
              >
                <option value="efectivo">💵 Efectivo</option>
                <option value="transferencia">📱 Transferencia</option>
                <option value="mixto">🔄 Mixto</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-red-950 dark:text-red-200 mb-1">
                Detalles / Bancos
              </label>
              <input
                type="text"
                value={editBankDetails}
                onChange={(e) => setEditBankDetails(e.target.value)}
                placeholder="Ej. Nequi, Daviplata"
                className="w-full px-4 py-2 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200 text-xs font-bold focus:outline-none"
              />
            </div>
          </div>

          {/* Descuento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-amber-50/60 dark:bg-[#200808] border border-amber-200 dark:border-amber-900/60">
            <div>
              <label className="block text-xs font-black uppercase text-amber-800 dark:text-amber-200 mb-1">
                Descuento (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={editDiscountPercent}
                onChange={(e) => setEditDiscountPercent(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-[#140505] border border-amber-200 text-xs font-bold focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-amber-800 dark:text-amber-200 mb-1">
                Motivo Descuento
              </label>
              <input
                type="text"
                value={editDiscountReason}
                onChange={(e) => setEditDiscountReason(e.target.value)}
                placeholder="Ej. Promo especial"
                className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-[#140505] border border-amber-200 text-xs font-bold focus:outline-none"
              />
            </div>
          </div>

          {/* Items de la Venta */}
          <div>
            <label className="block text-xs font-black uppercase text-red-950 dark:text-red-200 mb-2">
              Productos de la Venta
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {editItems.map((it) => (
                <div
                  key={it.product_id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-red-50/50 dark:bg-[#200808] border border-red-200/60 text-xs font-bold"
                >
                  <span className="truncate flex-1">{it.product_name}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditQuantity(it.product_id, -1)}
                      className="p-1 rounded-lg text-red-600 hover:bg-red-100 cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-black px-1">{it.quantity}</span>
                    <button
                      type="button"
                      onClick={() => handleEditQuantity(it.product_id, 1)}
                      className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-100 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <span className="text-red-600 dark:text-amber-400 font-black pl-2">
                      ${(it.unit_price * it.quantity).toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resumen Total */}
          <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-[#200808] border border-red-200 flex items-center justify-between text-xs font-bold">
            <span>Nuevo Total:</span>
            <span className="text-base font-black text-red-600 dark:text-amber-400">
              ${editTotal.toLocaleString('es-CO')}
            </span>
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-between pt-3 border-t border-red-100 dark:border-red-950">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false)
                handleDeleteSale(editingSale)
              }}
              className="px-4 py-2.5 rounded-2xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 font-black text-xs hover:bg-red-100 dark:hover:bg-red-900 cursor-pointer flex items-center gap-1.5"
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
                <p className="text-[10px] text-gray-500">Pago: {selectedSale.payment_method.toUpperCase()}</p>
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
