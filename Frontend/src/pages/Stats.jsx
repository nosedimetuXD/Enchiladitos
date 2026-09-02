import { useEffect, useState } from 'react'
import { api } from '../api/client'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Building2,
  Trophy,
  Flame,
  CreditCard,
  ShoppingBag,
  Sparkles,
  Calendar,
  CalendarRange,
  CalendarDays,
  Filter,
  ArrowRight,
  Check
} from 'lucide-react'

const MONTH_NAMES = [
  { num: 1, name: 'Enero' },
  { num: 2, name: 'Febrero' },
  { num: 3, name: 'Marzo' },
  { num: 4, name: 'Abril' },
  { num: 5, name: 'Mayo' },
  { num: 6, name: 'Junio' },
  { num: 7, name: 'Julio' },
  { num: 8, name: 'Agosto' },
  { num: 9, name: 'Septiembre' },
  { num: 10, name: 'Octubre' },
  { num: 11, name: 'Noviembre' },
  { num: 12, name: 'Diciembre' }
]

const AVAILABLE_YEARS = [2024, 2025, 2026, 2027, 2028]

export default function Stats() {
  const [summary, setSummary] = useState(null)
  const [period, setPeriod] = useState('month') // 'today' | 'week' | 'month' | 'prev_month' | 'year' | 'all' | 'custom' | 'month_year'
  
  const todayStr = new Date().toISOString().slice(0, 10)
  const [startDate, setStartDate] = useState(todayStr)
  const [endDate, setEndDate] = useState(todayStr)

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)

  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')

  async function loadStats(p = period, sDate = startDate, eDate = endDate, y = selectedYear, m = selectedMonth) {
    setLoading(true)
    setPageError('')
    try {
      let url = `/accounting/summary?period=${p}`
      if (p === 'custom') {
        if (!sDate || !eDate) {
          setLoading(false)
          return
        }
        url = `/accounting/summary?start_date=${sDate}&end_date=${eDate}`
      } else if (p === 'month_year') {
        url = `/accounting/summary?year=${y}&month_num=${m}`
      }
      const data = await api.get(url)
      setSummary(data)
    } catch (err) {
      setPageError('No se pudieron cargar las estadísticas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (period !== 'custom' && period !== 'month_year') {
      loadStats(period)
    } else if (period === 'month_year') {
      loadStats('month_year', startDate, endDate, selectedYear, selectedMonth)
    }
  }, [period])

  function handleApplyCustomRange(e) {
    e?.preventDefault?.()
    if (!startDate || !endDate) return
    loadStats('custom', startDate, endDate, selectedYear, selectedMonth)
  }

  function handleApplyMonthYear(e) {
    e?.preventDefault?.()
    loadStats('month_year', startDate, endDate, selectedYear, selectedMonth)
  }

  const mStats = summary?.monthly_stats || {}
  const totalIncome = summary?.total_income || 0
  const totalExpenses = summary?.total_expenses || 0
  const netBalance = summary?.net_balance || 0
  const avgTicket = summary?.average_ticket || (summary?.sales_count > 0 ? totalIncome / summary.sales_count : 0)

  // Etiqueta descriptiva del periodo actual
  function getPeriodLabel() {
    if (period === 'today') return 'Hoy'
    if (period === 'week') return 'Últimos 7 Días'
    if (period === 'month') return 'Este Mes en Curso'
    if (period === 'prev_month') return 'Mes Anterior'
    if (period === 'year') return `Año ${currentYear}`
    if (period === 'all') return 'Histórico Total'
    if (period === 'month_year') {
      const mName = MONTH_NAMES.find((m) => m.num === Number(selectedMonth))?.name || `Mes ${selectedMonth}`
      return `${mName} ${selectedYear}`
    }
    if (period === 'custom') {
      return `${startDate} al ${endDate}`
    }
    return ''
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 bg-white dark:bg-[#1c0707] p-6 rounded-3xl border border-red-200/80 dark:border-red-950/60 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-2xl bg-red-100 dark:bg-red-950 text-red-600 dark:text-amber-400">
                <BarChart3 className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-black tracking-tight text-[#450a0a] dark:text-[#fef2f2]">
                Estadísticas Ejecutivas
              </h1>
            </div>
            <p className="text-sm font-medium text-red-900/60 dark:text-red-300/60 mt-1">
              Rendimiento del negocio, productos más vendidos, clientes frecuentes y canales de cobro.
            </p>
          </div>

          {/* Badge del Filtro Activo */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-red-50 dark:bg-red-950/80 text-red-950 dark:text-red-200 text-xs font-black border border-red-200/70 dark:border-red-900/50">
              <Calendar className="w-3.5 h-3.5 text-red-600 dark:text-amber-400" />
              <span>{getPeriodLabel()}</span>
            </span>
          </div>
        </div>

        {/* Barra de Filtros Principales */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-red-100 dark:border-red-950/60">
          {[
            { id: 'today', label: 'Hoy' },
            { id: 'week', label: '7 Días' },
            { id: 'month', label: 'Este Mes' },
            { id: 'prev_month', label: 'Mes Anterior' },
            { id: 'year', label: 'Este Año' },
            { id: 'all', label: 'Histórico Total' },
            { id: 'month_year', label: 'Elegir Mes y Año', icon: CalendarDays },
            { id: 'custom', label: 'Rango de Fechas', icon: CalendarRange }
          ].map((p) => {
            const Icon = p.icon
            const isSelected = period === p.id
            return (
              <button
                key={p.id}
                onClick={() => {
                  setPeriod(p.id)
                  if (p.id === 'custom') {
                    // Cargar si ya hay fechas
                    loadStats('custom', startDate, endDate, selectedYear, selectedMonth)
                  } else if (p.id === 'month_year') {
                    loadStats('month_year', startDate, endDate, selectedYear, selectedMonth)
                  }
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-black whitespace-nowrap cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-xs scale-[1.02]'
                    : 'bg-red-50/70 dark:bg-[#200808] text-red-950/70 dark:text-red-200/70 hover:bg-red-100/70'
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                <span>{p.label}</span>
              </button>
            )
          })}
        </div>

        {/* Panel Interactivo: Selector de Mes y Año Específico */}
        {period === 'month_year' && (
          <form
            onSubmit={handleApplyMonthYear}
            className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 animate-in fade-in duration-200"
          >
            <div className="flex items-center gap-2 text-xs font-black text-[#450a0a] dark:text-[#fef2f2]">
              <CalendarDays className="w-4 h-4 text-red-600 dark:text-amber-400" />
              <span>Consultar Mes Específico:</span>
            </div>

            {/* Selector de Mes */}
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-bold text-red-900/60 dark:text-red-300/60">Mes:</label>
              <select
                value={selectedMonth}
                onChange={(e) => {
                  const m = Number(e.target.value)
                  setSelectedMonth(m)
                  loadStats('month_year', startDate, endDate, selectedYear, m)
                }}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#1a0505] border border-red-200/70 dark:border-red-950 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] cursor-pointer shadow-2xs focus:outline-none"
              >
                {MONTH_NAMES.map((m) => (
                  <option key={m.num} value={m.num}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector de Año */}
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-bold text-red-900/60 dark:text-red-300/60">Año:</label>
              <select
                value={selectedYear}
                onChange={(e) => {
                  const y = Number(e.target.value)
                  setSelectedYear(y)
                  loadStats('month_year', startDate, endDate, y, selectedMonth)
                }}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#1a0505] border border-red-200/70 dark:border-red-950 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] cursor-pointer shadow-2xs focus:outline-none"
              >
                {AVAILABLE_YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs cursor-pointer shadow-xs ml-auto transition-all"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Ver Estadísticas del Mes</span>
            </button>
          </form>
        )}

        {/* Panel Interactivo: Selector de Rango de Fechas */}
        {period === 'custom' && (
          <form
            onSubmit={handleApplyCustomRange}
            className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 animate-in fade-in duration-200"
          >
            <div className="flex items-center gap-2 text-xs font-black text-[#450a0a] dark:text-[#fef2f2]">
              <CalendarRange className="w-4 h-4 text-red-600 dark:text-amber-400" />
              <span>Rango Personalizado:</span>
            </div>

            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-bold text-red-900/60 dark:text-red-300/60">Desde:</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#1a0505] border border-red-200/70 dark:border-red-950 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] cursor-pointer shadow-2xs focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-bold text-red-900/60 dark:text-red-300/60">Hasta:</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#1a0505] border border-red-200/70 dark:border-red-950 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] cursor-pointer shadow-2xs focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs cursor-pointer shadow-xs ml-auto transition-all"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filtrar Fechas</span>
            </button>
          </form>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-600 border-t-transparent"></div>
          <p className="text-xs font-bold text-red-900/60 dark:text-red-400/60 mt-3">Calculando estadísticas...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tarjetas Principales de KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#1c0707] p-5 rounded-3xl border border-red-200/60 dark:border-red-950/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-red-900/50 dark:text-red-400/50">Total Facturado</span>
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                ${totalIncome.toLocaleString('es-CO')}
              </p>
              <span className="text-[11px] font-medium text-gray-500 mt-1 block">
                {summary?.sales_count || 0} ventas completadas
              </span>
            </div>

            <div className="bg-white dark:bg-[#1c0707] p-5 rounded-3xl border border-red-200/60 dark:border-red-950/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-red-900/50 dark:text-red-400/50">Gastos Totales</span>
                <div className="p-2 rounded-xl bg-red-100 dark:bg-red-950 text-red-600 dark:text-amber-400">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-red-600 dark:text-amber-400 mt-2">
                ${totalExpenses.toLocaleString('es-CO')}
              </p>
              <span className="text-[11px] font-medium text-gray-500 mt-1 block">
                {summary?.expenses_count || 0} gastos registrados
              </span>
            </div>

            <div className="bg-white dark:bg-[#1c0707] p-5 rounded-3xl border border-red-200/60 dark:border-red-950/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-red-900/50 dark:text-red-400/50">Utilidad Neta Real</span>
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-[#450a0a] dark:text-[#fef2f2] mt-2">
                ${netBalance.toLocaleString('es-CO')}
              </p>
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 mt-1 block">
                {totalIncome > 0 ? `${((netBalance / totalIncome) * 100).toFixed(1)}% margen` : '0% margen'}
              </span>
            </div>

            <div className="bg-white dark:bg-[#1c0707] p-5 rounded-3xl border border-red-200/60 dark:border-red-950/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-red-900/50 dark:text-red-400/50">Ticket Promedio</span>
                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-2">
                ${avgTicket.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
              </p>
              <span className="text-[11px] font-medium text-gray-500 mt-1 block">Por cliente en mostrador</span>
            </div>
          </div>

          {/* Grids de Rankings */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top 10 Productos Más Vendidos */}
            <div className="bg-white dark:bg-[#1c0707] p-6 rounded-3xl border border-red-200/80 dark:border-red-950/60 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-red-100 dark:bg-red-950 text-red-600 dark:text-amber-400">
                  <Flame className="w-4 h-4" />
                </span>
                <h3 className="font-black text-sm text-[#450a0a] dark:text-[#fef2f2]">Top Productos Más Vendidos</h3>
              </div>

              {(mStats.top_products || []).length === 0 ? (
                <p className="text-xs text-gray-500 py-6 text-center">No hay datos en este período</p>
              ) : (
                <div className="space-y-3">
                  {(mStats.top_products || []).map((tp, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-amber-400 font-black text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-[#450a0a] dark:text-[#fef2f2] truncate">
                          {tp.product_name}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-black text-red-600 dark:text-amber-400">{tp.total_qty} uds</span>
                        <span className="text-[10px] text-gray-500 block">
                          ${tp.total_amount.toLocaleString('es-CO')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top 10 Clientes Frecuentes */}
            <div className="bg-white dark:bg-[#1c0707] p-6 rounded-3xl border border-red-200/80 dark:border-red-950/60 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                  <Users className="w-4 h-4" />
                </span>
                <h3 className="font-black text-sm text-[#450a0a] dark:text-[#fef2f2]">Top Clientes Frecuentes</h3>
              </div>

              {(mStats.top_customers || []).length === 0 ? (
                <p className="text-xs text-gray-500 py-6 text-center">No hay clientes con nombre registrado en este período</p>
              ) : (
                <div className="space-y-3">
                  {(mStats.top_customers || []).map((tc, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 font-black text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-[#450a0a] dark:text-[#fef2f2] truncate">
                          {tc.customer_name}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-black text-emerald-600 dark:text-emerald-400">
                          ${tc.total_spent.toLocaleString('es-CO')}
                        </span>
                        <span className="text-[10px] text-gray-500 block">{tc.orders_count} pedidos</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Distribución por Bancos y Medios Digitales */}
            <div className="bg-white dark:bg-[#1c0707] p-6 rounded-3xl border border-red-200/80 dark:border-red-950/60 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                  <Building2 className="w-4 h-4" />
                </span>
                <h3 className="font-black text-sm text-[#450a0a] dark:text-[#fef2f2]">Transferencias & Bancos</h3>
              </div>

              {(mStats.top_banks || []).length === 0 ? (
                <p className="text-xs text-gray-500 py-6 text-center">No hay pagos por transferencia en este período</p>
              ) : (
                <div className="space-y-3">
                  {(mStats.top_banks || []).map((tb, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 font-black text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-[#450a0a] dark:text-[#fef2f2] truncate">
                          {tb.bank_name}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-black text-blue-600 dark:text-blue-400">
                          ${tb.total_amount.toLocaleString('es-CO')}
                        </span>
                        <span className="text-[10px] text-gray-500 block">{tb.count} pagos</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
