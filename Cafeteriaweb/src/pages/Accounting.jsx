import { useEffect, useState, useMemo } from 'react'
import { api } from '../api/client'
import Modal from '../components/Modal'
import {
  DollarSign,
  Plus,
  TrendingUp,
  TrendingDown,
  Calendar,
  Wallet,
  Package,
  Zap,
  Wrench,
  User,
  FileText,
  Banknote,
  Smartphone,
  CreditCard,
  ArrowUpDown,
  CircleDot,
  Building2
} from 'lucide-react'

export default function Accounting() {
  const [summary, setSummary] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [sales, setSales] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [period, setPeriod] = useState('month')
  const [activeTab, setActiveTab] = useState('sales')
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')

  // Modal Registrar Gasto
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('insumos')
  const [paymentMethod, setPaymentMethod] = useState('efectivo')
  const [ingredientId, setIngredientId] = useState('')
  const [quantityAdded, setQuantityAdded] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  async function loadData() {
    try {
      const [sumData, expData, ingData, salesData] = await Promise.all([
        api.get(`/accounting/summary?period=${period}`),
        api.get(`/expenses?period=${period}`),
        api.get('/ingredients'),
        api.get(`/sales?period=${period}`)
      ])
      setSummary(sumData)
      setExpenses(expData || [])
      setIngredients(ingData || [])
      setSales(salesData || [])
    } catch (err) {
      setPageError('No se pudo cargar la información de contabilidad')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [period])

  function openCreateModal() {
    setDescription('')
    setAmount('')
    setCategory('insumos')
    setPaymentMethod('efectivo')
    setIngredientId('')
    setQuantityAdded('')
    setFormError('')
    setIsModalOpen(true)
  }

  async function handleCreateExpense(e) {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')

    try {
      await api.post('/expenses', {
        description,
        amount: Number(amount),
        category,
        payment_method: paymentMethod,
        ingredient_id: category === 'insumos' && ingredientId ? ingredientId : null,
        quantity_added: category === 'insumos' && quantityAdded ? Number(quantityAdded) : 0
      })

      setIsModalOpen(false)
      await loadData()
    } catch (err) {
      setFormError(err.message || 'No se pudo registrar el gasto')
    } finally {
      setSubmitting(false)
    }
  }

  const categoryBadges = {
    insumos: { label: 'Insumos', style: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
    servicios: { label: 'Servicios', style: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
    mantenimiento: { label: 'Mantenimiento', style: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' },
    nomina: { label: 'Nómina', style: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
    otros: { label: 'Otros', style: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' }
  }

  const paymentBadges = {
    efectivo: { label: 'Efectivo', style: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
    transferencia: { label: 'Transferencia', style: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
    mixto: { label: 'Pago Mixto', style: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' }
  }

  if (loading) return <p className="p-4 text-sm font-semibold text-[#9F6839]">Cargando contabilidad...</p>

  const filteredSales = sales.filter((s) => {
    if (!s.created_at) return true
    const saleDate = new Date(s.created_at)
    const now = new Date()

    if (period === 'today') {
      return saleDate.toDateString() === now.toDateString()
    }
    if (period === 'week') {
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(now.getDate() - 7)
      return saleDate >= oneWeekAgo
    }
    if (period === 'month') {
      return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear()
    }
    return true
  })

  const filteredExpenses = expenses.filter((e) => {
    if (!e.created_at) return true
    const expDate = new Date(e.created_at)
    const now = new Date()

    if (period === 'today') {
      return expDate.toDateString() === now.toDateString()
    }
    if (period === 'week') {
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(now.getDate() - 7)
      return expDate >= oneWeekAgo
    }
    if (period === 'month') {
      return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear()
    }
    return true
  })

  const combinedMovements = [
    ...filteredSales.map((s) => ({
      id: s.id,
      type: 'income',
      date: s.created_at,
      concept: `Venta - ${s.customer_name || 'Cliente General'}`,
      details: `${s.sold_by_username ? `Vendido por ${s.sold_by_username}` : 'Venta POS'}${s.bank_details ? ` (${s.bank_details})` : ''}`,
      paymentMethod: s.payment_method,
      amount: s.total
    })),
    ...filteredExpenses.map((e) => ({
      id: e.id,
      type: 'expense',
      date: e.created_at,
      concept: e.description,
      details: e.registerer_name ? `Registrado por ${e.registerer_name}` : 'Gasto operativo',
      paymentMethod: e.payment_method,
      amount: e.amount
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date))

  // Ranking Top 5 Bancos / Entidades más usados
  const topBanksRanking = useMemo(() => {
    const bankStats = {} // bankName -> { count, total }

    filteredSales.forEach((s) => {
      if (s.bank_details && s.bank_details.trim()) {
        const parts = s.bank_details.split('|')
        parts.forEach((part) => {
          const subParts = part.split(':')
          if (subParts.length >= 2) {
            const bName = subParts[0].trim()
            const bAmountStr = subParts[1].replace(/[^0-9]/g, '')
            const bAmount = Number(bAmountStr) || 0

            if (bName) {
              if (!bankStats[bName]) bankStats[bName] = { count: 0, total: 0 }
              bankStats[bName].count += 1
              bankStats[bName].total += bAmount
            }
          }
        })
      } else if (s.payment_method === 'transferencia') {
        const bName = 'Transferencia General'
        if (!bankStats[bName]) bankStats[bName] = { count: 0, total: 0 }
        bankStats[bName].count += 1
        bankStats[bName].total += (s.transfer_amount || s.total || 0)
      }
    })

    const sorted = Object.entries(bankStats)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count || b.total - a.total)

    const maxCount = sorted.length > 0 ? sorted[0].count : 1

    return sorted.slice(0, 5).map((item) => ({
      ...item,
      percentage: Math.round((item.count / maxCount) * 100)
    }))
  }, [filteredSales])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#432414] dark:text-[#FEE4D7] tracking-tight">
            Contabilidad & Balance Financiero
          </h2>
          <p className="text-xs font-semibold text-[#9F6839] dark:text-[#DABA8C] mt-0.5">
            Registro unificado de ventas, ingresos, egresos y flujo de caja
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white dark:bg-[#201009] border border-[#D4B28E] dark:border-[#9F6839]/40">
            <Calendar className="w-3.5 h-3.5 text-[#9F6839]" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-transparent text-xs font-bold text-[#432414] dark:text-[#FEE4D7] cursor-pointer outline-none"
            >
              <option value="today">Hoy</option>
              <option value="week">Esta Semana</option>
              <option value="month">Este Mes</option>
              <option value="all">Histórico Total</option>
            </select>
          </div>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#9F6839] hover:bg-[#835229] text-white font-extrabold text-xs shadow-md cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" /> Registrar Gasto
          </button>
        </div>
      </div>

      {pageError && (
        <div className="p-3.5 rounded-2xl bg-red-50 text-red-700 border border-red-200 text-xs font-bold">
          ⚠️ {pageError}
        </div>
      )}

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#201009] border border-[#D4B28E] dark:border-[#9F6839]/40 rounded-3xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#9F6839] dark:text-[#DABA8C] text-xs font-bold mb-2">
            <span>Ingresos Totales</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600">
            ${(summary?.total_income || 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-[#9F6839] dark:text-[#DABA8C] mt-1 font-semibold">
            Ventas realizadas: {summary?.sales_count || 0}
          </p>
        </div>

        <div className="bg-white dark:bg-[#201009] border border-[#D4B28E] dark:border-[#9F6839]/40 rounded-3xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#9F6839] dark:text-[#DABA8C] text-xs font-bold mb-2">
            <span>Gastos Registrados</span>
            <TrendingDown className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-extrabold text-red-600">
            ${(summary?.total_expenses || 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-[#9F6839] dark:text-[#DABA8C] mt-1 font-semibold">
            Egresos cargados: {summary?.expenses_count || 0}
          </p>
        </div>

        <div className="bg-white dark:bg-[#201009] border border-[#D4B28E] dark:border-[#9F6839]/40 rounded-3xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#9F6839] dark:text-[#DABA8C] text-xs font-bold mb-2">
            <span>Balance Neto</span>
            <DollarSign className="w-4 h-4 text-[#9F6839]" />
          </div>
          <div className={`text-2xl font-extrabold ${(summary?.net_balance || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            ${(summary?.net_balance || 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-[#9F6839] dark:text-[#DABA8C] mt-1 font-semibold">
            Ingresos - Egresos
          </p>
        </div>

        <div className="bg-white dark:bg-[#201009] border border-[#D4B28E] dark:border-[#9F6839]/40 rounded-3xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#9F6839] dark:text-[#DABA8C] text-xs font-bold mb-2">
            <span>Desglose Métodos Pago</span>
            <Wallet className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xs space-y-1 mt-1 text-[#432414] dark:text-[#FEE4D7] font-bold">
            <div className="flex items-center gap-1.5">
              <Banknote className="w-3.5 h-3.5 text-emerald-600" />
              <span>Efectivo:</span>
              <strong>${(summary?.income_by_payment_method?.efectivo || 0).toLocaleString()}</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-blue-600" />
              <span>Transferencia:</span>
              <strong>${(summary?.income_by_payment_method?.transferencia || 0).toLocaleString()}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Ranking Top 5 Bancos / Entidades Más Usados */}
      <div className="bg-white dark:bg-[#201009] border border-[#D4B28E] dark:border-[#9F6839]/40 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#D4B28E]/40">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#9F6839]" />
            <h3 className="text-base font-extrabold text-[#432414] dark:text-[#FEE4D7]">
              Ranking Top 5 Bancos / Entidades Más Usados
            </h3>
          </div>
          <span className="text-xs font-bold text-[#9F6839]">
            Basado en transferencias recibidas
          </span>
        </div>

        {topBanksRanking.length === 0 ? (
          <p className="text-xs text-[#9F6839] font-medium py-3 text-center">
            No hay transferencias ni pagos digitales registrados en este periodo.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {topBanksRanking.map((bank, index) => (
              <div
                key={bank.name}
                className="p-3.5 rounded-2xl bg-[#FEE4D7]/30 dark:bg-[#2A150C] border border-[#D4B28E]/50 space-y-2 relative"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#432414] dark:text-[#FEE4D7] flex items-center gap-1.5 truncate">
                    <span className="w-5 h-5 rounded-full bg-[#9F6839] text-white text-[10px] flex items-center justify-center font-black shrink-0">
                      #{index + 1}
                    </span>
                    <span className="truncate">{bank.name}</span>
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[#9F6839] font-bold">
                    <span>{bank.count} {bank.count === 1 ? 'pago' : 'pagos'}</span>
                    <span className="text-[#432414] dark:text-[#FEE4D7] font-extrabold">${bank.total.toLocaleString()}</span>
                  </div>

                  <div className="w-full h-1.5 bg-[#D4B28E]/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#9F6839] rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(10, bank.percentage)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pestañas (Ingresos / Gastos / Flujo Combinado) */}
      <div className="flex items-center gap-2 border-b border-[#D4B28E]/40 pb-2">
        <button
          onClick={() => setActiveTab('sales')}
          className={`px-4 py-2 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'sales'
              ? 'bg-[#9F6839] text-white shadow-xs'
              : 'bg-white dark:bg-[#201009] border border-[#D4B28E] text-[#432414] dark:text-[#FEE4D7]'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          <span>Ingresos por Ventas</span>
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'expenses'
              ? 'bg-[#9F6839] text-white shadow-xs'
              : 'bg-white dark:bg-[#201009] border border-[#D4B28E] text-[#432414] dark:text-[#FEE4D7]'
          }`}
        >
          <TrendingDown className="w-3.5 h-3.5 text-red-500" />
          <span>Gastos & Egresos</span>
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-[#9F6839] text-white shadow-xs'
              : 'bg-white dark:bg-[#201009] border border-[#D4B28E] text-[#432414] dark:text-[#FEE4D7]'
          }`}
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-[#9F6839]" />
          <span>Flujo de Caja Combinado</span>
        </button>
      </div>

      {/* Pestaña 1: Ingresos por Ventas */}
      {activeTab === 'sales' && (
        <div className="bg-white dark:bg-[#201009] border border-[#D4B28E] dark:border-[#9F6839]/40 rounded-3xl shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FEE4D7]/50 dark:bg-[#2A150C] text-[#9F6839] dark:text-[#DABA8C] uppercase tracking-wider text-[10px] border-b border-[#D4B28E]/60 font-bold">
              <tr>
                <th className="py-3.5 px-4">Fecha / Hora</th>
                <th className="py-3.5 px-4">Cliente</th>
                <th className="py-3.5 px-4">Método de Pago & Entidad</th>
                <th className="py-3.5 px-4">Vendido Por</th>
                <th className="py-3.5 px-4 text-right">Monto Ingresado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D4B28E]/30 text-[#432414] dark:text-[#FEE4D7]">
              {filteredSales.map((s) => {
                const pBadge = paymentBadges[s.payment_method] || paymentBadges.efectivo
                return (
                  <tr key={s.id}>
                    <td className="py-3.5 px-4 font-semibold">{new Date(s.created_at).toLocaleString()}</td>
                    <td className="py-3.5 px-4 font-bold">{s.customer_name || 'Cliente General'}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-0.5">
                        <span className={`px-2.5 py-0.5 rounded-full font-extrabold text-[10px] w-max uppercase tracking-wider ${pBadge.style}`}>
                          {pBadge.label}
                        </span>
                        {s.bank_details && (
                          <span className="text-[10px] text-[#9F6839] dark:text-[#DABA8C] font-bold">
                            {s.bank_details}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">{s.sold_by_username || 'Vendedor'}</td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-emerald-600 text-sm">
                      +${s.total.toLocaleString()}
                    </td>
                  </tr>
                )
              })}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-[#9F6839] font-medium">
                    No hay ingresos registrados en este periodo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pestaña 2: Gastos Registrados */}
      {activeTab === 'expenses' && (
        <div className="bg-white dark:bg-[#201009] border border-[#D4B28E] dark:border-[#9F6839]/40 rounded-3xl shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FEE4D7]/50 dark:bg-[#2A150C] text-[#9F6839] dark:text-[#DABA8C] uppercase tracking-wider text-[10px] border-b border-[#D4B28E]/60 font-bold">
              <tr>
                <th className="py-3.5 px-4">Fecha</th>
                <th className="py-3.5 px-4">Descripción</th>
                <th className="py-3.5 px-4">Categoría</th>
                <th className="py-3.5 px-4">Forma Pago</th>
                <th className="py-3.5 px-4">Insumo Asociado</th>
                <th className="py-3.5 px-4 text-right">Monto Erogado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D4B28E]/30 text-[#432414] dark:text-[#FEE4D7]">
              {filteredExpenses.map((exp) => {
                const catBadge = categoryBadges[exp.category] || categoryBadges.otros
                return (
                  <tr key={exp.id}>
                    <td className="py-3.5 px-4 font-semibold">{new Date(exp.created_at).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4 font-bold">{exp.description}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full font-extrabold text-[10px] uppercase tracking-wider ${catBadge.style}`}>
                        {catBadge.label}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold">
                      {exp.payment_method === 'efectivo' ? 'Efectivo' : 'Transferencia'}
                    </td>
                    <td className="py-3.5 px-4">
                      {exp.ingredient_name ? (
                        <span className="text-emerald-600 font-bold text-xs">
                          + {exp.quantity_added} unidades de {exp.ingredient_name}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-red-600 text-sm">
                      -${exp.amount.toLocaleString()}
                    </td>
                  </tr>
                )
              })}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-[#9F6839] font-medium">
                    No hay gastos registrados en este periodo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pestaña 3: Flujo de Caja Combinado */}
      {activeTab === 'all' && (
        <div className="bg-white dark:bg-[#201009] border border-[#D4B28E] dark:border-[#9F6839]/40 rounded-3xl shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FEE4D7]/50 dark:bg-[#2A150C] text-[#9F6839] dark:text-[#DABA8C] uppercase tracking-wider text-[10px] border-b border-[#D4B28E]/60 font-bold">
              <tr>
                <th className="py-3.5 px-4">Fecha / Hora</th>
                <th className="py-3.5 px-4">Tipo</th>
                <th className="py-3.5 px-4">Concepto / Cliente</th>
                <th className="py-3.5 px-4">Detalles</th>
                <th className="py-3.5 px-4 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D4B28E]/30 text-[#432414] dark:text-[#FEE4D7]">
              {combinedMovements.map((m) => (
                <tr key={m.id} className={m.type === 'income' ? 'bg-emerald-50/30 dark:bg-emerald-950/20' : 'bg-red-50/30 dark:bg-red-950/20'}>
                  <td className="py-3.5 px-4 font-semibold">{new Date(m.date).toLocaleString()}</td>
                  <td className="py-3.5 px-4">
                    {m.type === 'income' ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px] uppercase tracking-wider inline-flex items-center gap-1">
                        <CircleDot className="w-3 h-3 text-emerald-600" /> Ingreso
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 font-extrabold text-[10px] uppercase tracking-wider inline-flex items-center gap-1">
                        <CircleDot className="w-3 h-3 text-red-600" /> Gasto
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-bold">{m.concept}</td>
                  <td className="py-3.5 px-4 text-[#9F6839] dark:text-[#DABA8C]">{m.details}</td>
                  <td className={`py-3.5 px-4 text-right font-extrabold text-sm ${m.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {m.type === 'income' ? `+$${m.amount.toLocaleString()}` : `-$${m.amount.toLocaleString()}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Registrar Gasto */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Nuevo Gasto / Egreso">
        <form onSubmit={handleCreateExpense} className="space-y-4">
          {formError && (
            <div className="p-3.5 rounded-2xl bg-red-50 text-red-700 border border-red-200 text-xs font-bold">
              ⚠️ {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#432414] dark:text-[#DABA8C] uppercase tracking-wider mb-1">
              Descripción del Gasto
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Compra de 5kg Café en Grano / Servicio de Luz"
              required
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#150904] border border-[#D4B28E] text-sm font-semibold text-[#432414] dark:text-[#FEE4D7]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#432414] dark:text-[#DABA8C] uppercase tracking-wider mb-1">
                Monto ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#150904] border border-[#D4B28E] text-sm font-semibold text-[#432414] dark:text-[#FEE4D7]"
              />
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
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#432414] dark:text-[#DABA8C] uppercase tracking-wider mb-1">
              Categoría
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#150904] border border-[#D4B28E] text-sm font-semibold text-[#432414] dark:text-[#FEE4D7]"
            >
              <option value="insumos">Insumos / Materia Prima</option>
              <option value="servicios">Servicios Básicos</option>
              <option value="mantenimiento">Mantenimiento & Equipos</option>
              <option value="nomina">Nómina & Empleados</option>
              <option value="otros">Otros Gastos</option>
            </select>
          </div>

          {category === 'insumos' && (
            <div className="p-3.5 rounded-2xl bg-[#FEE4D7]/50 dark:bg-[#2E180E] border border-[#D4B28E]">
              <span className="block text-xs font-bold text-[#9F6839] dark:text-[#DABA8C] mb-2">
                Reabastecer Inventario (Opcional)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={ingredientId}
                  onChange={(e) => setIngredientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#150904] border border-[#D4B28E] text-xs font-semibold"
                >
                  <option value="">No sumar a inventario</option>
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} ({ing.quantity} {ing.unit})
                    </option>
                  ))}
                </select>
                {ingredientId && (
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={quantityAdded}
                    onChange={(e) => setQuantityAdded(e.target.value)}
                    placeholder="Cantidad a sumar"
                    required
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#150904] border border-[#D4B28E] text-xs font-semibold"
                  />
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 rounded-2xl bg-white dark:bg-[#201009] border border-[#D4B28E] text-xs font-bold text-[#432414] dark:text-[#FEE4D7] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-2xl bg-[#9F6839] hover:bg-[#835229] text-white text-xs font-extrabold shadow-md cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : 'Registrar Gasto'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
