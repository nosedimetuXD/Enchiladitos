import { useEffect, useState } from 'react'
import { api } from '../api/client'
import Modal from '../components/Modal'
import MetricLineChart from '../components/MetricLineChart'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Award,
  Users,
  Calendar,
  CalendarDays,
  Building2,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Zap,
  Sun,
  Globe,
  Flame
} from 'lucide-react'

const MONTH_NAMES = [
  { num: 1, short: 'ene.', full: 'Enero' },
  { num: 2, short: 'feb.', full: 'Febrero' },
  { num: 3, short: 'mar.', full: 'Marzo' },
  { num: 4, short: 'abr.', full: 'Abril' },
  { num: 5, short: 'may.', full: 'Mayo' },
  { num: 6, short: 'jun.', full: 'Junio' },
  { num: 7, short: 'jul.', full: 'Julio' },
  { num: 8, short: 'ago.', full: 'Agosto' },
  { num: 9, short: 'sep.', full: 'Septiembre' },
  { num: 10, short: 'oct.', full: 'Octubre' },
  { num: 11, short: 'nov.', full: 'Noviembre' },
  { num: 12, short: 'dic.', full: 'Diciembre' }
]

export default function Stats() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')

  // Control de filtro y modal
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('month_year')
  const [displayLabel, setDisplayLabel] = useState('Mes Actual')

  // Estados de filtro
  const [period, setPeriod] = useState('month')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  async function loadStats(params = {}) {
    setLoading(true)
    setPageError('')
    try {
      let queryStr = ''
      if (params.startDate && params.endDate) {
        queryStr = `start_date=${params.startDate}&end_date=${params.endDate}`
      } else if (params.year && params.monthNum) {
        queryStr = `year=${params.year}&month_num=${params.monthNum}`
      } else {
        queryStr = `period=${params.period || period}`
      }

      const data = await api.get(`/accounting/summary?${queryStr}`)
      setSummary(data)
    } catch (err) {
      setPageError('No se pudieron cargar las estadísticas del período seleccionado')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats({ period: 'month' })
  }, [])

  function handleSelectPreset(presetKey, label) {
    setPeriod(presetKey)
    setDisplayLabel(label)
    setIsFilterModalOpen(false)
    loadStats({ period: presetKey })
  }

  function handleSelectMonthYear(year, monthNum, monthFull) {
    setSelectedYear(year)
    setSelectedMonth(monthNum)
    setDisplayLabel(`${monthFull} de ${year}`)
    setIsFilterModalOpen(false)
    loadStats({ year, monthNum })
  }

  function handleApplyCustomRange(e) {
    e.preventDefault()
    if (!startDate || !endDate) {
      alert('Por favor selecciona una fecha de inicio y de fin')
      return
    }
    setDisplayLabel(`${startDate} al ${endDate}`)
    setIsFilterModalOpen(false)
    loadStats({ startDate, endDate })
  }

  const mStats = summary?.monthly_stats

  return (
    <div className="space-y-4 text-[#450a0a] dark:text-[#fef2f2]">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#1a0606] border border-red-200/60 dark:border-red-950/60 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-50 dark:bg-[#200808] rounded-xl text-red-600 dark:text-amber-400 border border-red-200/60 dark:border-red-900/40">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#450a0a] dark:text-[#fef2f2]">
              Estadísticas Ejecutivas & Reportes
            </h1>
            <p className="text-xs text-red-900/60 dark:text-red-300/60 mt-0.5">
              Dashboard de rendimiento financiero, productos estrella y clientes top
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsFilterModalOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-[#200808] hover:bg-red-50/50 dark:hover:bg-[#2a0c0c] text-[#450a0a] dark:text-[#fef2f2] rounded-xl text-xs font-semibold border border-red-200/70 dark:border-red-900/50 shadow-xs transition-colors cursor-pointer"
        >
          <Calendar className="w-4 h-4 text-red-600 dark:text-amber-400" />
          <span>{displayLabel}</span>
          <ChevronDown className="w-3.5 h-3.5 text-red-900/50 dark:text-red-300/50" />
        </button>
      </div>

      {pageError && (
        <div className="p-3.5 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{pageError}</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 bg-white dark:bg-[#1a0606] border border-red-200/60 dark:border-red-950/60 rounded-2xl">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-600 border-t-transparent"></div>
          <p className="text-xs font-bold text-red-900/60 dark:text-red-300/60 mt-3">Calculando estadísticas...</p>
        </div>
      ) : (
        <>
          {/* Unified Metrics Bar — Linear / De-AI Style (Hero 2:1 Asymmetric Layout) */}
          {(() => {
            const netProfit = mStats?.net_profit || 0
            const income = mStats?.monthly_income || 0
            const expenses = mStats?.monthly_expenses || 0
            const margin = income > 0 ? Math.round((netProfit / income) * 100) : 0

            const statsTrendData = (mStats?.top_products || []).slice(0, 8).map((prod) => ({
              label: prod.product_name.length > 7 ? prod.product_name.substring(0, 7) + '..' : prod.product_name,
              value: Number(prod.total_amount) || 0,
              secondaryValue: (Number(prod.total_qty) || 0) * 15000
            }))

            return (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* Large Hero Box (2 cols) */}
                <div className="lg:col-span-2 bg-white dark:bg-[#1a0606] border border-red-200/60 dark:border-red-950/60 rounded-xl p-3.5 sm:p-4 flex flex-col justify-between shadow-xs relative overflow-hidden">
                  {/* Header Row: Title & Balance + Badge */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-red-900/60 dark:text-red-300/60 block">
                        Ganancia Neta Consolidada
                      </span>
                      <div className={`mt-0.5 text-2xl sm:text-3xl font-black tracking-tight tabular-nums ${netProfit >= 0 ? 'text-[#450a0a] dark:text-[#fef2f2]' : 'text-rose-600 dark:text-rose-400'}`}>
                        ${Number(netProfit).toLocaleString('es-CO')}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${netProfit >= 0 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${netProfit >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {netProfit >= 0 ? 'Utilidad Operativa' : 'Déficit'}
                      </span>
                      <p className="text-[10px] text-red-900/50 dark:text-red-300/50 mt-1">
                        Curva de Facturación ({displayLabel})
                      </p>
                    </div>
                  </div>

                  {/* Center Body: Full-Width MetricLineChart */}
                  <div className="my-2.5 py-1 w-full">
                    <MetricLineChart
                      data={statsTrendData}
                      line1Color="#dc2626"
                      line2Color="#ea580c"
                      line1Label="Facturación"
                      line2Label="Unidades Val."
                      hasSecondary={statsTrendData.length > 0}
                      formatValue={(v) => `$${Number(v).toLocaleString('es-CO')}`}
                      height={125}
                    />
                  </div>

                  {/* Sub-breakdown 3 columns at bottom */}
                  <div className="mt-3 pt-2.5 border-t border-red-200/40 dark:border-red-950/40 grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-[10px] font-semibold text-red-900/60 dark:text-red-300/60 block uppercase tracking-wider">
                        Ingresos Brutos
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums block mt-0.5">
                        ${Number(income).toLocaleString('es-CO')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-red-900/60 dark:text-red-300/60 block uppercase tracking-wider">
                        Gastos & Egresos
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 tabular-nums block mt-0.5">
                        -${Number(expenses).toLocaleString('es-CO')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-red-900/60 dark:text-red-300/60 block uppercase tracking-wider">
                        Margen Operativo
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-[#450a0a] dark:text-[#fef2f2] tabular-nums block mt-0.5">
                        {margin}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stacked Side Cards (1 col) */}
                <div className="lg:col-span-1 flex flex-col gap-2">
                  <div className="bg-white dark:bg-[#1a0606] border border-red-200/60 dark:border-red-950/60 rounded-xl p-2.5 sm:p-3 flex-1 flex flex-col justify-between shadow-xs">
                    <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-red-900/60 dark:text-red-300/60">
                      <span>Ventas Totales</span>
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="my-0.5 text-base sm:text-lg font-black tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
                      ${Number(income).toLocaleString('es-CO')}
                    </div>
                    <span className="text-[10px] text-red-900/50 dark:text-red-300/50 font-normal">
                      Ingreso facturado en {displayLabel}
                    </span>
                  </div>

                  <div className="bg-white dark:bg-[#1a0606] border border-red-200/60 dark:border-red-950/60 rounded-xl p-2.5 sm:p-3 flex-1 flex flex-col justify-between shadow-xs">
                    <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-red-900/60 dark:text-red-300/60">
                      <span>Gastos Totales</span>
                      <TrendingDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div className="my-0.5 text-base sm:text-lg font-black tracking-tight text-rose-600 dark:text-rose-400 tabular-nums">
                      -${Number(expenses).toLocaleString('es-CO')}
                    </div>
                    <span className="text-[10px] text-red-900/50 dark:text-red-300/50 font-normal">
                      Egresos e insumos del período
                    </span>
                  </div>

                  <div className="bg-white dark:bg-[#1a0606] border border-red-200/60 dark:border-red-950/60 rounded-xl p-2.5 sm:p-3 flex-1 flex flex-col justify-between shadow-xs">
                    <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-red-900/60 dark:text-red-300/60">
                      <span>Margen de Ganancia</span>
                      <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="my-0.5 text-base sm:text-lg font-black tracking-tight text-[#450a0a] dark:text-[#fef2f2] tabular-nums">
                      {margin}%
                    </div>
                    <span className="text-[10px] text-red-900/50 dark:text-red-300/50 font-normal">
                      Rentabilidad sobre ventas brutas
                    </span>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Rankings Grid: Top 10 Productos, Top 10 Clientes, Distribución de Bancos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Top 10 Productos Más Vendidos */}
            <div className="bg-white dark:bg-[#1a0606] border border-red-200/60 dark:border-red-950/60 rounded-xl p-3.5 sm:p-4 space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-red-200/40 dark:border-red-950/40">
                <h3 className="text-xs font-semibold text-[#450a0a] dark:text-[#fef2f2] flex items-center gap-2 uppercase tracking-wider">
                  <Flame className="w-4 h-4 text-red-600 dark:text-amber-400" />
                  <span>Top 10 Productos</span>
                </h3>
                <span className="text-[11px] text-red-900/50 dark:text-red-300/50">Por unidades</span>
              </div>

              {!mStats?.top_products || mStats.top_products.length === 0 ? (
                <p className="text-xs text-red-900/50 dark:text-red-300/50 py-6 text-center">No hay productos vendidos en este período.</p>
              ) : (
                <div className="divide-y divide-red-100 dark:divide-red-950/40 max-h-[340px] overflow-y-auto pr-1">
                  {mStats.top_products.slice(0, 10).map((prod, idx) => (
                    <div key={prod.product_name || idx} className="py-2 px-1.5 flex items-center justify-between gap-2.5 hover:bg-red-50/50 dark:hover:bg-[#200808] transition-colors rounded-lg">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded text-[10px] font-bold text-red-700 dark:text-amber-400 bg-red-100/70 dark:bg-[#2a0c0c] border border-red-200/60 dark:border-red-900/40 flex items-center justify-center shrink-0 tabular-nums">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-medium text-[#450a0a] dark:text-[#fef2f2] truncate">{prod.product_name}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-semibold text-[#450a0a] dark:text-[#fef2f2] block tabular-nums">{prod.total_qty} ud(s)</span>
                        <span className="text-[10px] text-red-900/60 dark:text-red-300/60 tabular-nums">${Number(prod.total_amount).toLocaleString('es-CO')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top 10 Clientes del Periodo */}
            <div className="bg-white dark:bg-[#1a0606] border border-red-200/60 dark:border-red-950/60 rounded-xl p-3.5 sm:p-4 space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-red-200/40 dark:border-red-950/40">
                <h3 className="text-xs font-semibold text-[#450a0a] dark:text-[#fef2f2] flex items-center gap-2 uppercase tracking-wider">
                  <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Top 10 Clientes</span>
                </h3>
                <span className="text-[11px] text-red-900/50 dark:text-red-300/50">Por facturación</span>
              </div>

              {!mStats?.top_customers || mStats.top_customers.length === 0 ? (
                <p className="text-xs text-red-900/50 dark:text-red-300/50 py-6 text-center">No hay compras con nombre de cliente en este período.</p>
              ) : (
                <div className="divide-y divide-red-100 dark:divide-red-950/40 max-h-[340px] overflow-y-auto pr-1">
                  {mStats.top_customers.slice(0, 10).map((c, idx) => (
                    <div key={c.customer_name || idx} className="py-2 px-1.5 flex items-center justify-between gap-2.5 hover:bg-red-50/50 dark:hover:bg-[#200808] transition-colors rounded-lg">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100/70 dark:bg-[#2a0c0c] border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-center shrink-0 tabular-nums">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-medium text-[#450a0a] dark:text-[#fef2f2] truncate">{c.customer_name}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-semibold text-[#450a0a] dark:text-[#fef2f2] block tabular-nums">${Number(c.total_spent).toLocaleString('es-CO')}</span>
                        <span className="text-[10px] text-red-900/60 dark:text-red-300/60 tabular-nums">{c.orders_count} compra(s)</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Distribución por Bancos y Medios Digitales */}
            <div className="bg-white dark:bg-[#1a0606] border border-red-200/60 dark:border-red-950/60 rounded-xl p-3.5 sm:p-4 space-y-3 md:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between pb-2.5 border-b border-red-200/40 dark:border-red-950/40">
                <h3 className="text-xs font-semibold text-[#450a0a] dark:text-[#fef2f2] flex items-center gap-2 uppercase tracking-wider">
                  <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Transferencias & Bancos</span>
                </h3>
                <span className="text-[11px] text-red-900/50 dark:text-red-300/50">Por recaudación</span>
              </div>

              {!mStats?.top_banks || mStats.top_banks.length === 0 ? (
                <p className="text-xs text-red-900/50 dark:text-red-300/50 py-6 text-center">No hay transferencias bancarias registradas.</p>
              ) : (
                <div className="divide-y divide-red-100 dark:divide-red-950/40 max-h-[340px] overflow-y-auto pr-1">
                  {mStats.top_banks.map((tb, idx) => (
                    <div key={tb.bank_name || idx} className="py-2 px-1.5 flex items-center justify-between gap-2.5 hover:bg-red-50/50 dark:hover:bg-[#200808] transition-colors rounded-lg">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded text-[10px] font-bold text-blue-700 dark:text-blue-400 bg-blue-100/70 dark:bg-[#0c1a2a] border border-blue-200/60 dark:border-blue-900/40 flex items-center justify-center shrink-0 tabular-nums">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-medium text-[#450a0a] dark:text-[#fef2f2] truncate">{tb.bank_name}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 block tabular-nums">${Number(tb.total_amount).toLocaleString('es-CO')}</span>
                        <span className="text-[10px] text-red-900/60 dark:text-red-300/60 tabular-nums">{tb.count} pago(s)</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal / Popover de Filtro de Período y Fechas */}
      <Modal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        title="Filtrar Período & Fechas de Estadísticas"
      >
        <div className="space-y-4">
          {/* Navegación por pestañas */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-red-50/60 dark:bg-[#200808] border border-red-200/60 dark:border-red-900/40">
            <button
              type="button"
              onClick={() => setActiveTab('month_year')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'month_year'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-[#450a0a] dark:text-[#fef2f2] hover:bg-red-100/60 dark:hover:bg-[#2a0c0c]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Mes & Año</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('custom')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'custom'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-[#450a0a] dark:text-[#fef2f2] hover:bg-red-100/60 dark:hover:bg-[#2a0c0c]'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Rango Calendario</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preset')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'preset'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-[#450a0a] dark:text-[#fef2f2] hover:bg-red-100/60 dark:hover:bg-[#2a0c0c]'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Rápido</span>
            </button>
          </div>

          {/* TAB 1: Mes & Año */}
          {activeTab === 'month_year' && (
            <div className="space-y-3 p-3.5 rounded-xl bg-white dark:bg-[#140505] border border-red-200/60 dark:border-red-950/60 shadow-xs">
              {/* Selector de Año */}
              <div className="flex items-center justify-between pb-2.5 border-b border-red-200/40 dark:border-red-950/40">
                <button
                  type="button"
                  onClick={() => setSelectedYear(selectedYear - 1)}
                  className="p-1.5 rounded-lg border border-red-200/60 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-[#200808] text-[#450a0a] dark:text-[#fef2f2] cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold text-[#450a0a] dark:text-[#fef2f2] tabular-nums">
                  {selectedYear}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedYear(selectedYear + 1)}
                  className="p-1.5 rounded-lg border border-red-200/60 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-[#200808] text-[#450a0a] dark:text-[#fef2f2] cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Grid de 12 Meses */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {MONTH_NAMES.map((m) => {
                  const isSelected = selectedMonth === m.num

                  return (
                    <button
                      key={m.num}
                      type="button"
                      onClick={() => handleSelectMonthYear(selectedYear, m.num, m.full)}
                      className={`py-2 px-1 rounded-lg text-xs font-semibold text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'bg-red-50/50 dark:bg-[#200808] text-[#450a0a] dark:text-[#fef2f2] hover:bg-red-100/70 dark:hover:bg-[#2a0c0c] border border-red-200/50 dark:border-red-900/40'
                      }`}
                    >
                      {m.short}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Rango Calendario (Fecha Inicio - Fecha Fin) */}
          {activeTab === 'custom' && (
            <form onSubmit={handleApplyCustomRange} className="space-y-3 p-3.5 rounded-xl bg-white dark:bg-[#140505] border border-red-200/60 dark:border-red-950/60 shadow-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-red-900/60 dark:text-red-300/60 uppercase mb-1">
                    Fecha Inicio
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1a0606] border border-red-200/70 dark:border-red-900/50 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-red-900/60 dark:text-red-300/60 uppercase mb-1">
                    Fecha Fin
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1a0606] border border-red-200/70 dark:border-red-900/50 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Aplicar Rango de Fechas</span>
              </button>
            </form>
          )}

          {/* TAB 3: Opciones Rápidas */}
          {activeTab === 'preset' && (
            <div className="grid grid-cols-2 gap-2 p-0.5">
              <button
                type="button"
                onClick={() => handleSelectPreset('month', 'Mes Actual')}
                className="p-2.5 rounded-xl bg-white dark:bg-[#140505] border border-red-200/60 dark:border-red-900/40 hover:bg-red-50/50 dark:hover:bg-[#200808] text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] text-left cursor-pointer flex items-center gap-2 transition-colors"
              >
                <Calendar className="w-4 h-4 text-red-600 dark:text-amber-400" />
                <span>Mes Actual</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('prev_month', 'Mes Anterior')}
                className="p-2.5 rounded-xl bg-white dark:bg-[#140505] border border-red-200/60 dark:border-red-900/40 hover:bg-red-50/50 dark:hover:bg-[#200808] text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] text-left cursor-pointer flex items-center gap-2 transition-colors"
              >
                <Clock className="w-4 h-4 text-red-600 dark:text-amber-400" />
                <span>Mes Anterior</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('week', 'Esta Semana')}
                className="p-2.5 rounded-xl bg-white dark:bg-[#140505] border border-red-200/60 dark:border-red-900/40 hover:bg-red-50/50 dark:hover:bg-[#200808] text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] text-left cursor-pointer flex items-center gap-2 transition-colors"
              >
                <BarChart3 className="w-4 h-4 text-red-600 dark:text-amber-400" />
                <span>Esta Semana</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('today', 'Hoy')}
                className="p-2.5 rounded-xl bg-white dark:bg-[#140505] border border-red-200/60 dark:border-red-900/40 hover:bg-red-50/50 dark:hover:bg-[#200808] text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] text-left cursor-pointer flex items-center gap-2 transition-colors"
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Hoy</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('year', 'Este Año')}
                className="p-2.5 rounded-xl bg-white dark:bg-[#140505] border border-red-200/60 dark:border-red-900/40 hover:bg-red-50/50 dark:hover:bg-[#200808] text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] text-left cursor-pointer flex items-center gap-2 transition-colors"
              >
                <Building2 className="w-4 h-4 text-red-600 dark:text-amber-400" />
                <span>Este Año</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('all', 'Histórico Total')}
                className="p-2.5 rounded-xl bg-white dark:bg-[#140505] border border-red-200/60 dark:border-red-900/40 hover:bg-red-50/50 dark:hover:bg-[#200808] text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] text-left cursor-pointer flex items-center gap-2 transition-colors"
              >
                <Globe className="w-4 h-4 text-blue-600" />
                <span>Histórico Total</span>
              </button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
