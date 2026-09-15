import { useEffect, useState, useMemo } from 'react'
import { api } from '../api/client'
import Modal from '../components/Modal'
import {
  DollarSign,
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  Building2,
  Trash2,
  Edit2,
  Download,
  FileSpreadsheet,
  ChevronDown,
  Tag,
  ShoppingBag,
  Coins,
  Package
} from 'lucide-react'
import { exportAccountingToExcel, exportAccountingToCSV } from '../utils/csvExport'
import { useAuth } from '../context/AuthContext'
import MetricLineChart from '../components/MetricLineChart'

const EXPENSE_CATEGORIES = [
  { id: 'materia_prima', label: 'Materia Prima / Productos' },
  { id: 'empaques', label: 'Empaques y Desechables' },
  { id: 'servicios', label: 'Servicios Públicos / Internet' },
  { id: 'arriendo', label: 'Arriendo / Local' },
  { id: 'nomina', label: 'Nómina / Personal' },
  { id: 'marketing', label: 'Publicidad y Marketing' },
  { id: 'mantenimiento', label: 'Mantenimiento y Reparaciones' },
  { id: 'otros', label: 'Otros Gastos' }
]

const INCOME_CATEGORIES = [
  { id: 'ventas_extra', label: 'Ventas Especiales / Eventos' },
  { id: 'inversion', label: 'Inyección de Capital / Aporte' },
  { id: 'reembolso', label: 'Reembolso / Devolución' },
  { id: 'otros', label: 'Otros Ingresos' }
]

export default function Accounting() {
  const { user } = useAuth()
  const isOwner = (user?.role || '').toLowerCase() === 'owner' || (user?.role || '').toLowerCase() === 'dueño'
  const isAdmin = (user?.role || '').toLowerCase() === 'admin' || (user?.role || '').toLowerCase() === 'administrador'
  const canManage = isOwner || isAdmin

  const [summary, setSummary] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [incomes, setIncomes] = useState([])
  const [activeTab, setActiveTab] = useState('expenses') // 'expenses' | 'incomes'
  const [period, setPeriod] = useState('month')
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [expandedExpenseId, setExpandedExpenseId] = useState(null)
  const [expandedIncomeId, setExpandedIncomeId] = useState(null)

  // Modal Gasto
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [expDescription, setExpDescription] = useState('')
  const [expAmount, setExpAmount] = useState('')
  const [expCategory, setExpCategory] = useState('materia_prima')
  const [expPaymentMethod, setExpPaymentMethod] = useState('efectivo')
  const [expDate, setExpDate] = useState('')
  const [expSubmitting, setExpSubmitting] = useState(false)

  // Modal Ingreso
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false)
  const [editingIncome, setEditingIncome] = useState(null)
  const [incDescription, setIncDescription] = useState('')
  const [incAmount, setIncAmount] = useState('')
  const [incCategory, setIncCategory] = useState('otros')
  const [incPaymentMethod, setIncPaymentMethod] = useState('efectivo')
  const [incDate, setIncDate] = useState('')
  const [incSubmitting, setIncSubmitting] = useState(false)

  // Filtro de Ingresos (all | sale | customer_payment | manual)
  const [incomeFilter, setIncomeFilter] = useState('all')

  async function loadData() {
    setLoading(true)
    setPageError('')
    try {
      const [sumData, expData, incData] = await Promise.all([
        api.get(`/accounting/summary?period=${period}`).catch(() => null),
        api.get(`/expenses?period=${period}`).catch(() => []),
        api.get(`/incomes?period=${period}`).catch(() => [])
      ])
      setSummary(sumData)
      setExpenses(Array.isArray(expData) ? expData : [])
      setIncomes(Array.isArray(incData) ? incData : [])
    } catch (err) {
      console.error('Error cargando contabilidad:', err)
      setPageError('No se pudieron cargar los datos contables')
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
  }, [period])

  function getLocalDatetimeString(dateObj = new Date()) {
    const d = new Date(dateObj)
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16)
  }

  // Helpers Gasto
  function openCreateExpense() {
    setEditingExpense(null)
    setExpDescription('')
    setExpAmount('')
    setExpCategory('materia_prima')
    setExpPaymentMethod('efectivo')
    setExpDate(getLocalDatetimeString())
    setIsExpenseModalOpen(true)
  }

  function openEditExpense(exp) {
    setEditingExpense(exp)
    setExpDescription(exp.description || '')
    setExpAmount(exp.amount || '')
    setExpCategory(exp.category || 'materia_prima')
    setExpPaymentMethod(exp.payment_method || 'efectivo')
    setExpDate(exp.created_at ? new Date(exp.created_at).toISOString().substring(0, 16) : getLocalDatetimeString())
    setIsExpenseModalOpen(true)
  }

  async function handleSaveExpense(e) {
    e.preventDefault()
    setExpSubmitting(true)
    try {
      const payload = {
        description: expDescription.trim(),
        amount: Number(expAmount),
        category: expCategory,
        payment_method: expPaymentMethod,
        custom_date: expDate
      }

      if (editingExpense) {
        await api.put(`/expenses/${editingExpense.id}`, payload)
      } else {
        await api.post('/expenses', payload)
      }

      setIsExpenseModalOpen(false)
      await loadData()
    } catch (err) {
      alert(err.message || 'Error guardando gasto')
    } finally {
      setExpSubmitting(false)
    }
  }

  async function handleDeleteExpense(exp) {
    if (!window.confirm(`¿Estás seguro de eliminar el gasto "${exp.description}" por $${Number(exp.amount).toLocaleString('es-CO')}?`)) return
    try {
      await api.delete(`/expenses/${exp.id}`)
      setExpenses((prev) => prev.filter((item) => item.id !== exp.id))
      await loadData()
    } catch (err) {
      alert(err.message || 'Error eliminando gasto')
    }
  }

  // Helpers Ingreso
  function openCreateIncome() {
    setEditingIncome(null)
    setIncDescription('')
    setIncAmount('')
    setIncCategory('otros')
    setIncPaymentMethod('efectivo')
    setIncDate(getLocalDatetimeString())
    setIsIncomeModalOpen(true)
  }

  function openEditIncome(inc) {
    setEditingIncome(inc)
    setIncDescription(inc.description || '')
    setIncAmount(inc.amount || '')
    setIncCategory(inc.category || 'otros')
    setIncPaymentMethod(inc.payment_method || 'efectivo')
    setIncDate(inc.created_at ? new Date(inc.created_at).toISOString().substring(0, 16) : getLocalDatetimeString())
    setIsIncomeModalOpen(true)
  }

  async function handleSaveIncome(e) {
    e.preventDefault()
    setIncSubmitting(true)
    try {
      const payload = {
        description: incDescription.trim(),
        amount: Number(incAmount),
        category: incCategory,
        payment_method: incPaymentMethod,
        custom_date: incDate
      }

      if (editingIncome) {
        await api.put(`/incomes/${editingIncome.id}`, payload)
      } else {
        await api.post('/incomes', payload)
      }

      setIsIncomeModalOpen(false)
      await loadData()
    } catch (err) {
      alert(err.message || 'Error guardando ingreso')
    } finally {
      setIncSubmitting(false)
    }
  }

  async function handleDeleteIncome(inc) {
    if (!window.confirm(`¿Estás seguro de eliminar el ingreso "${inc.description}" por $${Number(inc.amount).toLocaleString('es-CO')}?`)) return
    try {
      await api.delete(`/incomes/${inc.id}`)
      setIncomes((prev) => prev.filter((item) => item.id !== inc.id))
      await loadData()
    } catch (err) {
      alert(err.message || 'Error eliminando ingreso')
    }
  }

  function handleExportExcel() {
    exportAccountingToExcel(expenses, incomes, `Contabilidad_Enchiladitos_${period}_${new Date().toISOString().slice(0, 10)}.xls`)
  }

  function handleExportCSV() {
    exportAccountingToCSV(expenses, incomes, `Contabilidad_Enchiladitos_${period}_${new Date().toISOString().slice(0, 10)}.csv`)
  }

  const salesIncomes = useMemo(() => incomes.filter((i) => i.type === 'sale'), [incomes])
  const abonosIncomes = useMemo(() => incomes.filter((i) => i.type === 'customer_payment'), [incomes])
  const manualIncomes = useMemo(() => incomes.filter((i) => (i.type || 'manual') === 'manual'), [incomes])

  const salesIncomeTotal = useMemo(() => salesIncomes.reduce((sum, i) => sum + (i.amount || 0), 0), [salesIncomes])
  const abonosIncomeTotal = useMemo(() => abonosIncomes.reduce((sum, i) => sum + (i.amount || 0), 0), [abonosIncomes])
  const manualIncomeTotal = useMemo(() => manualIncomes.reduce((sum, i) => sum + (i.amount || 0), 0), [manualIncomes])

  const totalIngresosCalc = useMemo(() => {
    return summary?.total_income ?? (salesIncomeTotal + abonosIncomeTotal + manualIncomeTotal)
  }, [summary, salesIncomeTotal, abonosIncomeTotal, manualIncomeTotal])

  const totalGastosCalc = useMemo(() => {
    return summary?.total_expenses ?? expenses.reduce((sum, e) => sum + (e.amount || 0), 0)
  }, [summary, expenses])

  const balanceNetoCalc = totalIngresosCalc - totalGastosCalc
  const margenOperativo = totalIngresosCalc > 0 ? Math.round((balanceNetoCalc / totalIngresosCalc) * 100) : 0

  // Datos comparativos de Ingresos vs Gastos para MetricLineChart
  const accountingTrendData = useMemo(() => {
    const dateMap = {}

    incomes.forEach((inc) => {
      const d = new Date(inc.created_at)
      const label = d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
      if (!dateMap[label]) dateMap[label] = { label, value: 0, secondaryValue: 0, date: d }
      dateMap[label].value += Number(inc.amount || 0)
    })

    expenses.forEach((exp) => {
      const d = new Date(exp.created_at)
      const label = d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
      if (!dateMap[label]) dateMap[label] = { label, value: 0, secondaryValue: 0, date: d }
      dateMap[label].secondaryValue += Number(exp.amount || 0)
    })

    const sorted = Object.values(dateMap).sort((a, b) => a.date - b.date)
    return sorted.map(({ label, value, secondaryValue }) => ({ label, value, secondaryValue }))
  }, [incomes, expenses])

  const filteredIncomes = useMemo(() => {
    if (incomeFilter === 'all') return incomes
    return incomes.filter((inc) => (inc.type || 'manual') === incomeFilter)
  }, [incomes, incomeFilter])

  return (
    <div className="space-y-6 text-[#450a0a] dark:text-[#fef2f2]">
      {/* Header Principal */}
      <div className="bg-white dark:bg-[#1a0606] border border-red-200/60 dark:border-red-950/60 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-50 dark:bg-[#200808] rounded-xl text-red-600 dark:text-amber-400 border border-red-200/60 dark:border-red-950/60">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#450a0a] dark:text-[#fef2f2]">
                Contabilidad & Flujo de Caja
              </h1>
              <p className="text-xs text-red-900/60 dark:text-red-300/60 mt-0.5">
                Control de ingresos, gastos clasificados, balance neto y exportación contable.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
          {/* Grupo Exportacion */}
          <div className="inline-flex items-center p-0.5 bg-white dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 rounded-xl shadow-xs">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-all cursor-pointer whitespace-nowrap"
              title="Descargar en formato Excel (.xls)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Excel</span>
            </button>
            <div className="h-3.5 w-px bg-red-200/60 dark:bg-red-950/60 mx-0.5" />
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-700 dark:text-amber-400 hover:bg-red-50 dark:hover:bg-[#2c0b0b] rounded-lg transition-all cursor-pointer whitespace-nowrap"
              title="Descargar en formato CSV"
            >
              <Download className="w-3.5 h-3.5 text-red-700 dark:text-amber-400" />
              <span>CSV</span>
            </button>
          </div>

          {/* Grupo Acciones Principales */}
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={openCreateIncome}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Ingreso</span>
            </button>

            <button
              type="button"
              onClick={openCreateExpense}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Gasto</span>
            </button>
          </div>
        </div>
      </div>

      {/* Unified Metrics Bar — Asymmetric 2:1 Hero Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Large Hero Box (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1a0606] border border-red-200/60 dark:border-red-950/60 rounded-xl p-3.5 sm:p-4 flex flex-col justify-between shadow-xs">
          {/* Header Row: Title & Balance + Badge */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-red-900/70 dark:text-red-300/70 block">
                Ganancia Neta
              </span>
              <div className={`mt-0.5 text-2xl sm:text-3xl font-black tracking-tight tabular-nums ${balanceNetoCalc >= 0 ? 'text-[#450a0a] dark:text-[#fef2f2]' : 'text-rose-600 dark:text-rose-400'}`}>
                ${Number(balanceNetoCalc).toLocaleString('es-CO')}
              </div>
            </div>

            <div className="text-right">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${balanceNetoCalc >= 0 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${balanceNetoCalc >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                {balanceNetoCalc >= 0 ? 'Balance Positivo' : 'Déficit'}
              </span>
              <div className="flex items-center justify-end gap-3 text-[10px] font-semibold mt-1">
                <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Ingresos
                </span>
                <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
                  <span className="w-2 h-2 rounded-full bg-rose-500" /> Gastos
                </span>
              </div>
            </div>
          </div>

          {/* Center Body: Full-Width MetricLineChart (Ingresos vs Gastos) */}
          <div className="my-2.5 py-1 w-full">
            <MetricLineChart
              data={accountingTrendData}
              line1Color="#10b981"
              line2Color="#dc2626"
              line1Label="Ingresos"
              line2Label="Gastos"
              hasSecondary={true}
              formatValue={(v) => `$${Number(v).toLocaleString('es-CO')}`}
              height={125}
            />
          </div>

          {/* Sub-breakdown 3 columns at bottom */}
          <div className="mt-3 pt-2.5 border-t border-red-200/40 dark:border-red-950/40 grid grid-cols-3 gap-2">
            <div>
              <span className="text-[10px] font-semibold text-red-900/60 dark:text-red-300/60 block uppercase tracking-wider">
                Ventas POS
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#450a0a] dark:text-[#fef2f2] tabular-nums block mt-0.5">
                ${Number(salesIncomeTotal).toLocaleString('es-CO')}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-red-900/60 dark:text-red-300/60 block uppercase tracking-wider">
                Ingresos Extras
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#450a0a] dark:text-[#fef2f2] tabular-nums block mt-0.5">
                ${Number(manualIncomeTotal + abonosIncomeTotal).toLocaleString('es-CO')}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-red-900/60 dark:text-red-300/60 block uppercase tracking-wider">
                Egresos / Gastos
              </span>
              <span className="text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 tabular-nums block mt-0.5">
                -${Number(totalGastosCalc).toLocaleString('es-CO')}
              </span>
            </div>
          </div>
        </div>

        {/* Stacked Side Cards (1 col) */}
        <div className="lg:col-span-1 flex flex-col gap-2">
          <div className="bg-white dark:bg-[#1a0606] border border-red-200/60 dark:border-red-950/60 rounded-xl p-2.5 sm:p-3 flex-1 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-red-900/70 dark:text-red-300/70">
              <span>Ingresos Totales</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="my-0.5 text-base sm:text-lg font-black tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
              +${Number(totalIngresosCalc).toLocaleString('es-CO')}
            </div>
            <span className="text-[10px] text-red-900/60 dark:text-red-300/60 font-normal">
              {incomes.length} ingresos registrados
            </span>
          </div>

          <div className="bg-white dark:bg-[#1a0606] border border-red-200/60 dark:border-red-950/60 rounded-xl p-2.5 sm:p-3 flex-1 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-red-900/70 dark:text-red-300/70">
              <span>Gastos Totales</span>
              <TrendingDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="my-0.5 text-base sm:text-lg font-black tracking-tight text-rose-600 dark:text-rose-400 tabular-nums">
              -${Number(totalGastosCalc).toLocaleString('es-CO')}
            </div>
            <span className="text-[10px] text-red-900/60 dark:text-red-300/60 font-normal">
              {expenses.length} egresos clasificados
            </span>
          </div>

          <div className="bg-white dark:bg-[#1a0606] border border-red-200/60 dark:border-red-950/60 rounded-xl p-2.5 sm:p-3 flex-1 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-red-900/70 dark:text-red-300/70">
              <span>Margen Operativo</span>
              <Wallet className="w-3.5 h-3.5 opacity-60" />
            </div>
            <div className="my-0.5 text-base sm:text-lg font-black tracking-tight text-[#450a0a] dark:text-[#fef2f2] tabular-nums">
              {margenOperativo}%
            </div>
            <span className="text-[10px] text-red-900/60 dark:text-red-300/60 font-normal">
              Rentabilidad estimada del período
            </span>
          </div>
        </div>
      </div>

      {/* Tabs y Periodos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-red-200/40 dark:border-red-950/40 pb-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('expenses')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'expenses'
                ? 'bg-red-600 text-white font-bold'
                : 'text-red-900/70 dark:text-red-300/70 hover:bg-red-50 dark:hover:bg-[#200808]'
            }`}
          >
            Gastos ({expenses.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('incomes')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'incomes'
                ? 'bg-red-600 text-white font-bold'
                : 'text-red-900/70 dark:text-red-300/70 hover:bg-red-50 dark:hover:bg-[#200808]'
            }`}
          >
            Ingresos ({incomes.length})
          </button>
        </div>

        {/* Selector de Periodo */}
        <div className="flex items-center gap-1 bg-white dark:bg-[#1a0606] p-0.5 rounded-lg border border-red-200/60 dark:border-red-950/60 self-start sm:self-auto overflow-x-auto">
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
              className={`px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer whitespace-nowrap ${
                period === p.id
                  ? 'bg-red-600 text-white font-bold'
                  : 'text-red-900/70 dark:text-red-300/70 hover:bg-red-50 dark:hover:bg-[#200808] font-medium'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB GASTOS */}
      {activeTab === 'expenses' && (
        <div className="bg-white dark:bg-[#1a0606] border border-red-200/60 dark:border-red-950/60 rounded-2xl overflow-hidden">
          {expenses.length === 0 ? (
            <div className="p-12 text-center text-red-900/60 dark:text-red-300/60">
              <TrendingDown className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="font-semibold text-xs">No hay gastos registrados en este periodo</p>
            </div>
          ) : (
            <>
              {/* VISTA MOVIL PARA GASTOS (Acordeón expandible) */}
              <div className="block md:hidden divide-y divide-red-100 dark:divide-red-950/50">
                {expenses.map((e) => {
                  const isExpanded = expandedExpenseId === e.id
                  const catInitials = (e.category || 'GA').substring(0, 2).toUpperCase()

                  return (
                    <div key={e.id} className="transition-colors">
                      <div
                        onClick={() => setExpandedExpenseId(isExpanded ? null : e.id)}
                        className="p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-red-50/40 dark:hover:bg-red-950/20 transition-colors select-none"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-[#2c0b0b] text-red-600 dark:text-amber-400 font-black text-xs flex items-center justify-center border border-red-200/60 dark:border-red-900/40 shrink-0">
                            {catInitials}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-xs text-[#450a0a] dark:text-[#fef2f2] truncate">
                              {e.description}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-800 dark:text-amber-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                {e.category}
                              </span>
                              <span className="text-[10px] text-red-900/50 dark:text-red-300/50 tabular-nums">
                                · {new Date(e.created_at).toLocaleDateString('es-CO')}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold text-xs sm:text-sm text-rose-600 dark:text-rose-400 tabular-nums">
                            -${Number(e.amount).toLocaleString('es-CO')}
                          </span>
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
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2 rounded-xl bg-white/80 dark:bg-[#140505]/70 border border-red-200/50 dark:border-red-950/40">
                              <span className="text-[10px] uppercase font-semibold text-red-900/60 dark:text-red-300/60 block">
                                Método de Pago
                              </span>
                              <span className="font-medium text-[#450a0a] dark:text-[#fef2f2] capitalize block mt-0.5">
                                {e.payment_method}
                              </span>
                            </div>
                            <div className="p-2 rounded-xl bg-white/80 dark:bg-[#140505]/70 border border-red-200/50 dark:border-red-950/40">
                              <span className="text-[10px] uppercase font-semibold text-red-900/60 dark:text-red-300/60 block">
                                Registrado Por
                              </span>
                              <span className="font-medium text-[#450a0a] dark:text-[#fef2f2] block mt-0.5 truncate">
                                {e.registerer_name || 'Personal'}
                              </span>
                            </div>
                          </div>

                          <div className="text-[10px] text-red-900/60 dark:text-red-300/50 tabular-nums">
                            Fecha y hora exacta: {new Date(e.created_at).toLocaleString('es-CO')}
                          </div>

                          {canManage && (
                            <div className="flex items-center gap-2 pt-2 border-t border-red-200/40 dark:border-red-950/40">
                              <button
                                type="button"
                                onClick={() => openEditExpense(e)}
                                className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold text-red-700 dark:text-amber-400 bg-white dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Editar</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteExpense(e)}
                                className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Eliminar</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* VISTA ESCRITORIO PARA GASTOS (Linear Table) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-red-50/40 dark:bg-[#200808] border-b border-red-200/60 dark:border-red-950/60 text-red-900/70 dark:text-red-300/70 uppercase font-semibold text-[11px] tracking-wider">
                    <tr>
                      <th className="px-2.5 py-2 whitespace-nowrap">Fecha</th>
                      <th className="px-2.5 py-2">Descripción & Categoría</th>
                      <th className="px-2.5 py-2 whitespace-nowrap">Método de Pago</th>
                      <th className="px-2.5 py-2 text-right whitespace-nowrap">Monto</th>
                      <th className="px-2.5 py-2 whitespace-nowrap">Registrado Por</th>
                      <th className="px-2.5 py-2 text-right whitespace-nowrap w-20 min-w-[70px]">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100 dark:divide-red-950/40">
                    {expenses.map((e) => (
                      <tr key={e.id} className="hover:bg-red-50/30 dark:hover:bg-red-950/20 transition-colors duration-100 group">
                        <td className="px-2.5 py-1.5 font-medium text-[#450a0a] dark:text-[#fef2f2] whitespace-nowrap text-xs">
                          <span className="tabular-nums">{new Date(e.created_at).toLocaleDateString('es-CO')}</span>
                          <span className="text-[10px] text-red-900/60 dark:text-red-300/50 font-normal tabular-nums ml-1">
                            {new Date(e.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td className="px-2.5 py-1.5">
                          <div className="font-semibold text-[#450a0a] dark:text-[#fef2f2] text-xs">{e.description}</div>
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded-md bg-red-100/70 dark:bg-[#200808] text-red-800 dark:text-amber-400 text-[10px] font-medium uppercase border border-red-200/50 dark:border-red-950/40">
                            {e.category}
                          </span>
                        </td>
                        <td className="px-2.5 py-1.5 capitalize text-[#450a0a] dark:text-[#fef2f2] font-normal text-xs">
                          {e.payment_method}
                        </td>
                        <td className="px-2.5 py-1.5 font-bold text-rose-600 dark:text-rose-400 text-xs text-right tabular-nums whitespace-nowrap">
                          -${Number(e.amount).toLocaleString('es-CO')}
                        </td>
                        <td className="px-2.5 py-1.5 text-red-900/70 dark:text-red-300/60 font-normal text-xs">
                          {e.registerer_name || 'Personal'}
                        </td>
                        <td className="px-2.5 py-1.5 text-right whitespace-nowrap w-20 min-w-[70px]">
                          {canManage && (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => openEditExpense(e)}
                                className="p-1 text-red-700 dark:text-amber-400 hover:text-[#450a0a] dark:hover:text-white hover:bg-red-100 dark:hover:bg-[#2c0b0b] rounded-md transition-colors cursor-pointer"
                                title="Editar Gasto"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteExpense(e)}
                                className="p-1 text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors cursor-pointer"
                                title="Eliminar Gasto"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB INGRESOS */}
      {activeTab === 'incomes' && (
        <div className="space-y-3">
          {/* Subfiltro de Ingresos */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#1a0606] p-1 rounded-xl border border-red-200/60 dark:border-red-950/60 w-fit">
            {[
              { id: 'all', label: `Todos (${incomes.length})` },
              { id: 'sale', label: `Ventas POS (${salesIncomes.length})` },
              { id: 'customer_payment', label: `Abonos Deuda (${abonosIncomes.length})` },
              { id: 'manual', label: `Ingresos Extras (${manualIncomes.length})` }
            ].map((f) => (
              <button
                type="button"
                key={f.id}
                onClick={() => setIncomeFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  incomeFilter === f.id
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-red-900/70 dark:text-red-300/70 hover:bg-red-50 dark:hover:bg-[#200808]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="bg-white dark:bg-[#1a0606] border border-red-200/60 dark:border-red-950/60 rounded-2xl overflow-hidden">
            {filteredIncomes.length === 0 ? (
              <div className="p-12 text-center text-red-900/60 dark:text-red-300/60">
                <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="font-semibold text-xs">No hay ingresos registrados bajo este filtro</p>
              </div>
            ) : (
              <>
                {/* VISTA MOVIL PARA INGRESOS */}
                <div className="block md:hidden divide-y divide-red-100 dark:divide-red-950/50">
                  {filteredIncomes.map((inc) => {
                    const isExpanded = expandedIncomeId === inc.id
                    const isManual = (inc.type || 'manual') === 'manual'
                    const incInitials = (inc.type === 'sale' ? 'POS' : inc.type === 'customer_payment' ? 'AB' : 'EX')

                    return (
                      <div key={inc.id} className="transition-colors">
                        <div
                          onClick={() => setExpandedIncomeId(isExpanded ? null : inc.id)}
                          className="p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-red-50/40 dark:hover:bg-red-950/20 transition-colors select-none"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={`w-9 h-9 rounded-full font-black text-xs flex items-center justify-center border shrink-0 ${
                              inc.type === 'sale'
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40'
                                : inc.type === 'customer_payment'
                                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/40'
                                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/40'
                            }`}>
                              {incInitials}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-xs text-[#450a0a] dark:text-[#fef2f2] truncate">
                                {inc.description}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  {inc.type === 'sale' ? 'Venta POS' : inc.type === 'customer_payment' ? 'Abono Deuda' : 'Extra'}
                                </span>
                                <span className="text-[10px] text-red-900/50 dark:text-red-300/50 tabular-nums">
                                  · {new Date(inc.created_at).toLocaleDateString('es-CO')}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 tabular-nums">
                              +${Number(inc.amount).toLocaleString('es-CO')}
                            </span>
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
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="p-2 rounded-xl bg-white/80 dark:bg-[#140505]/70 border border-red-200/50 dark:border-red-950/40">
                                <span className="text-[10px] uppercase font-semibold text-red-900/60 dark:text-red-300/60 block">
                                  Método de Pago
                                </span>
                                <span className="font-medium text-[#450a0a] dark:text-[#fef2f2] capitalize block mt-0.5">
                                  {inc.payment_method || 'Efectivo'}
                                </span>
                              </div>
                              <div className="p-2 rounded-xl bg-white/80 dark:bg-[#140505]/70 border border-red-200/50 dark:border-red-950/40">
                                <span className="text-[10px] uppercase font-semibold text-red-900/60 dark:text-red-300/60 block">
                                  Tipo de Flujo
                                </span>
                                <span className="font-medium text-[#450a0a] dark:text-[#fef2f2] block mt-0.5 truncate capitalize">
                                  {inc.type === 'sale' ? 'Venta Facturada' : inc.type === 'customer_payment' ? 'Abono Cartera' : 'Manual Extra'}
                                </span>
                              </div>
                            </div>

                            <div className="text-[10px] text-red-900/60 dark:text-red-300/50 tabular-nums">
                              Fecha y hora exacta: {new Date(inc.created_at).toLocaleString('es-CO')}
                            </div>

                            {isManual && canManage && (
                              <div className="flex items-center gap-2 pt-2 border-t border-red-200/40 dark:border-red-950/40">
                                <button
                                  type="button"
                                  onClick={() => openEditIncome(inc)}
                                  className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-white dark:bg-[#200808] border border-emerald-200/60 dark:border-emerald-950/60 flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  <span>Editar</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteIncome(inc)}
                                  className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Eliminar</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* VISTA ESCRITORIO PARA INGRESOS */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-red-50/40 dark:bg-[#200808] border-b border-red-200/60 dark:border-red-950/60 text-red-900/70 dark:text-red-300/70 uppercase font-semibold text-[11px] tracking-wider">
                      <tr>
                        <th className="px-2.5 py-2 whitespace-nowrap">Fecha</th>
                        <th className="px-2.5 py-2">Descripción</th>
                        <th className="px-2.5 py-2 whitespace-nowrap">Tipo</th>
                        <th className="px-2.5 py-2 whitespace-nowrap">Método de Pago</th>
                        <th className="px-2.5 py-2 text-right whitespace-nowrap">Monto</th>
                        <th className="px-2.5 py-2 text-right whitespace-nowrap w-20 min-w-[70px]">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-100 dark:divide-red-950/40">
                      {filteredIncomes.map((inc) => {
                        const isManual = (inc.type || 'manual') === 'manual'

                        return (
                          <tr key={inc.id} className="hover:bg-red-50/30 dark:hover:bg-red-950/20 transition-colors duration-100 group">
                            <td className="px-2.5 py-1.5 font-medium text-[#450a0a] dark:text-[#fef2f2] whitespace-nowrap text-xs">
                              <span className="tabular-nums">{new Date(inc.created_at).toLocaleDateString('es-CO')}</span>
                              <span className="text-[10px] text-red-900/60 dark:text-red-300/50 font-normal tabular-nums ml-1">
                                {new Date(inc.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </td>
                            <td className="px-2.5 py-1.5">
                              <div className="font-semibold text-[#450a0a] dark:text-[#fef2f2] text-xs">{inc.description}</div>
                              {inc.notes && (
                                <div className="text-[10px] text-red-900/60 dark:text-red-300/50 line-clamp-1">{inc.notes}</div>
                              )}
                            </td>
                            <td className="px-2.5 py-1.5 whitespace-nowrap">
                              <span className={`inline-block px-1.5 py-0.2 rounded-md text-[10px] font-semibold uppercase border ${
                                inc.type === 'sale'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40'
                                  : inc.type === 'customer_payment'
                                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/40'
                                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/40'
                              }`}>
                                {inc.type === 'sale' ? 'Venta POS' : inc.type === 'customer_payment' ? 'Abono Deuda' : 'Extra'}
                              </span>
                            </td>
                            <td className="px-2.5 py-1.5 capitalize text-[#450a0a] dark:text-[#fef2f2] font-normal text-xs">
                              {inc.payment_method || 'Efectivo'}
                            </td>
                            <td className="px-2.5 py-1.5 font-bold text-emerald-600 dark:text-emerald-400 text-xs text-right tabular-nums whitespace-nowrap">
                              +${Number(inc.amount).toLocaleString('es-CO')}
                            </td>
                            <td className="px-2.5 py-1.5 text-right whitespace-nowrap w-20 min-w-[70px]">
                              {isManual && canManage && (
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => openEditIncome(inc)}
                                    className="p-1 text-emerald-700 dark:text-emerald-400 hover:text-[#450a0a] dark:hover:text-white hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-md transition-colors cursor-pointer"
                                    title="Editar Ingreso"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteIncome(inc)}
                                    className="p-1 text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors cursor-pointer"
                                    title="Eliminar Ingreso"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
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
        </div>
      )}

      {/* Modal Crear / Editar Gasto */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title={editingExpense ? 'Editar Gasto' : 'Registrar Nuevo Gasto'}
      >
        <form onSubmit={handleSaveExpense} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-red-900/70 dark:text-red-300/70 mb-1">
              Descripción del Gasto *
            </label>
            <input
              type="text"
              required
              value={expDescription}
              onChange={(e) => setExpDescription(e.target.value)}
              placeholder="Ej. Vasos desechables, bolsas, recibo energía..."
              className="w-full px-3 py-2 rounded-xl bg-red-50/50 dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-red-900/70 dark:text-red-300/70 mb-1">
                Monto ($) *
              </label>
              <input
                type="number"
                required
                min="100"
                step="50"
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                placeholder="25000"
                className="w-full px-3 py-2 rounded-xl bg-red-50/50 dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-red-500 tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-red-900/70 dark:text-red-300/70 mb-1">
                Fecha & Hora
              </label>
              <input
                type="datetime-local"
                value={expDate}
                onChange={(e) => setExpDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-red-50/50 dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-red-900/70 dark:text-red-300/70 mb-1">
                Categoría
              </label>
              <select
                value={expCategory}
                onChange={(e) => setExpCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-red-50/50 dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 text-xs font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-red-900/70 dark:text-red-300/70 mb-1">
                Método de Pago
              </label>
              <select
                value={expPaymentMethod}
                onChange={(e) => setExpPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-red-50/50 dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 text-xs font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia / Nequi / Bancolombia</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-red-200/40 dark:border-red-950/40">
            <button
              type="button"
              onClick={() => setIsExpenseModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-red-900/70 dark:text-red-300/70 hover:bg-red-100/60 dark:hover:bg-[#2c0b0b] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={expSubmitting}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-semibold text-xs shadow-xs cursor-pointer disabled:opacity-50"
            >
              {expSubmitting ? 'Guardando...' : editingExpense ? 'Actualizar Gasto' : 'Registrar Gasto'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Crear / Editar Ingreso */}
      <Modal
        isOpen={isIncomeModalOpen}
        onClose={() => setIsIncomeModalOpen(false)}
        title={editingIncome ? 'Editar Ingreso Extra' : 'Registrar Nuevo Ingreso'}
      >
        <form onSubmit={handleSaveIncome} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-red-900/70 dark:text-red-300/70 mb-1">
              Descripción del Ingreso *
            </label>
            <input
              type="text"
              required
              value={incDescription}
              onChange={(e) => setIncDescription(e.target.value)}
              placeholder="Ej. Venta en evento escolar, aporte personal..."
              className="w-full px-3 py-2 rounded-xl bg-red-50/50 dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-red-900/70 dark:text-red-300/70 mb-1">
                Monto ($) *
              </label>
              <input
                type="number"
                required
                min="100"
                step="50"
                value={incAmount}
                onChange={(e) => setIncAmount(e.target.value)}
                placeholder="50000"
                className="w-full px-3 py-2 rounded-xl bg-red-50/50 dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-red-500 tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-red-900/70 dark:text-red-300/70 mb-1">
                Fecha & Hora
              </label>
              <input
                type="datetime-local"
                value={incDate}
                onChange={(e) => setIncDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-red-50/50 dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-red-900/70 dark:text-red-300/70 mb-1">
                Categoría
              </label>
              <select
                value={incCategory}
                onChange={(e) => setIncCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-red-50/50 dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 text-xs font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                {INCOME_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-red-900/70 dark:text-red-300/70 mb-1">
                Método de Pago
              </label>
              <select
                value={incPaymentMethod}
                onChange={(e) => setIncPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-red-50/50 dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 text-xs font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia / Nequi / Bancolombia</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-red-200/40 dark:border-red-950/40">
            <button
              type="button"
              onClick={() => setIsIncomeModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-red-900/70 dark:text-red-300/70 hover:bg-red-100/60 dark:hover:bg-[#2c0b0b] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={incSubmitting}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs cursor-pointer disabled:opacity-50"
            >
              {incSubmitting ? 'Guardando...' : editingIncome ? 'Actualizar Ingreso' : 'Registrar Ingreso'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
