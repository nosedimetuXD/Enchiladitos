import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Award, Flame, Users, Calendar, Building2, AlertTriangle, Trophy, Clock } from 'lucide-react'

export default function Stats() {
  const [summary, setSummary] = useState(null)
  const [period, setPeriod] = useState('month')
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')

  async function loadStats(p = period) {
    try {
      const data = await api.get(`/accounting/summary?period=${p}`)
      setSummary(data)
    } catch (err) {
      setPageError('No se pudieron cargar las estadísticas ejecutivas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  if (loading) return <p className="p-4 text-sm font-semibold text-[#9F6839]">Cargando estadísticas ejecutivas...</p>

  const mStats = summary?.monthly_stats

  return (
    <div className="space-y-6">
      {/* Header Banner con Patron de Marca Toffe */}
      <div className="relative rounded-3xl overflow-hidden p-6 border border-[#D4B28E] dark:border-[#9F6839]/40 shadow-sm bg-[#432414] text-[#FEE4D7]">
        <div className="absolute inset-0 opacity-15 bg-cover bg-center pointer-events-none" style={{ backgroundImage: "url('/toffe-pattern-dark.png')" }} />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-[#DABA8C]" />
              <span>Estadísticas Ejecutivas & Reportes</span>
            </h2>
            <p className="text-xs font-semibold text-[#DABA8C] mt-1">
              Dashboard exclusivo del dueño con ranking de ventas, productos estrella y clientes top
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold text-white shadow-xs">
            <Calendar className="w-4 h-4 text-[#DABA8C]" />
            <select
              value={period}
              onChange={(e) => {
                const newPeriod = e.target.value
                setPeriod(newPeriod)
                loadStats(newPeriod)
              }}
              className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
            >
              <option value="month" className="text-black">Mes Actual</option>
              <option value="prev_month" className="text-black">Mes Anterior</option>
              <option value="week" className="text-black">Esta Semana</option>
              <option value="today" className="text-black">Hoy</option>
              <option value="all" className="text-black">Histórico Total</option>
            </select>
          </div>
        </div>
      </div>

      {pageError && (
        <div className="p-3.5 rounded-2xl bg-red-50 text-red-700 border border-red-200 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span>{pageError}</span>
        </div>
      )}

      {/* Tarjetas KPI Financieras Exec */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-[#201009] border border-[#D4B28E] dark:border-[#9F6839]/40 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-[#9F6839] dark:text-[#DABA8C] mb-2">
            <span>Ventas Totales</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600">
            ${(mStats?.monthly_income || 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-[#9F6839] dark:text-[#DABA8C] mt-1 font-semibold">
            Ingreso bruto facturado
          </p>
        </div>

        <div className="bg-white dark:bg-[#201009] border border-[#D4B28E] dark:border-[#9F6839]/40 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-[#9F6839] dark:text-[#DABA8C] mb-2">
            <span>Gastos Totales</span>
            <TrendingDown className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-extrabold text-red-600">
            ${(mStats?.monthly_expenses || 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-[#9F6839] dark:text-[#DABA8C] mt-1 font-semibold">
            Egresos del período
          </p>
        </div>

        <div className="bg-white dark:bg-[#201009] border border-[#D4B28E] dark:border-[#9F6839]/40 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-[#9F6839] dark:text-[#DABA8C] mb-2">
            <span>Ganancia Neta</span>
            <DollarSign className="w-4 h-4 text-[#9F6839]" />
          </div>
          <div className={`text-2xl font-extrabold ${(mStats?.net_profit || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            ${(mStats?.net_profit || 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-[#9F6839] dark:text-[#DABA8C] mt-1 font-semibold">
            Utilidad disponible
          </p>
        </div>

        <div className="bg-white dark:bg-[#201009] border border-[#D4B28E] dark:border-[#9F6839]/40 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-[#9F6839] dark:text-[#DABA8C] mb-2">
            <span>Tiempo Prom. Comandas</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-[#432414] dark:text-[#FEE4D7]">
            {mStats?.avg_prep_time_minutes > 0 ? `${Math.round(mStats.avg_prep_time_minutes)} min` : '—'}
          </div>
          <p className="text-[11px] text-[#9F6839] dark:text-[#DABA8C] mt-1 font-semibold">
            Demora salida de comandas
          </p>
        </div>

        <div className="bg-white dark:bg-[#201009] border border-[#D4B28E] dark:border-[#9F6839]/40 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-[#9F6839] dark:text-[#DABA8C] mb-2">
            <span className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-500" /> Mejor Vendedor
            </span>
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          {mStats?.top_seller ? (
            <div>
              <div className="text-base font-extrabold text-[#432414] dark:text-[#FEE4D7]">
                {mStats.top_seller.username} <span className="text-[10px] bg-[#FEE4D7] dark:bg-[#34180D] px-2 py-0.5 rounded-full border border-[#D4B28E]">({mStats.top_seller.role})</span>
              </div>
              <div className="text-xs font-bold text-emerald-600 mt-1">
                ${mStats.top_seller.total_amount.toLocaleString()} ({mStats.top_seller.sales_count} ventas)
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#9F6839]">Sin ventas este mes</p>
          )}
        </div>
      </div>

      {/* Tarjeta de Ranking Top 5 Bancos / Entidades Más Usados (Exactamente matching Image 1) */}
      <div className="bg-white dark:bg-[#201009] border border-[#D4B28E] dark:border-[#9F6839]/40 rounded-3xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#D4B28E]/40">
          <h3 className="text-base font-extrabold text-[#432414] dark:text-[#FEE4D7] flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#9F6839]" />
            <span>Ranking Top 5 Bancos / Entidades Más Usados</span>
          </h3>
          <span className="text-xs font-bold text-[#9F6839]">Basado en transferencias recibidas</span>
        </div>

        {!mStats?.top_banks || mStats.top_banks.length === 0 ? (
          <p className="text-xs text-[#9F6839] font-medium py-3 text-center">No hay transferencias ni pagos digitales registrados este mes.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {mStats.top_banks.map((bank, idx) => (
              <div key={bank.bank_name || idx} className="p-3 rounded-2xl bg-[#FEE4D7]/30 dark:bg-[#2A150C] border border-[#D4B28E]/50 space-y-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-4 h-4 rounded-full bg-[#9F6839] text-white text-[9px] font-black flex items-center justify-center shrink-0">
                    #{idx + 1}
                  </span>
                  <span className="text-xs font-extrabold text-[#432414] dark:text-[#FEE4D7] truncate">{bank.bank_name}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#D4B28E]/30">
                  <span className="text-[#9F6839] font-semibold">{bank.count} pago(s)</span>
                  <strong className="font-extrabold text-[#432414] dark:text-[#FEE4D7]">${bank.total_amount.toLocaleString()}</strong>
                </div>
                <div className="w-full h-1.5 bg-[#D4B28E]/40 rounded-full overflow-hidden">
                  <div className="h-full bg-[#9F6839] rounded-full" style={{ width: `${Math.min(100, Math.max(20, 100 - idx * 20))}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rankings Grid: Top 10 Productos Más Vendidos y Top 10 Clientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top 10 Productos Más Vendidos */}
        <div className="bg-white dark:bg-[#201009] border border-[#D4B28E] dark:border-[#9F6839]/40 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#D4B28E]/40">
            <h3 className="text-base font-extrabold text-[#432414] dark:text-[#FEE4D7] flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <span>Top 10 Productos Más Vendidos</span>
            </h3>
            <span className="text-xs font-bold text-[#9F6839]">Por unidades vendidas</span>
          </div>

          {!mStats?.top_products || mStats.top_products.length === 0 ? (
            <p className="text-xs text-[#9F6839] font-medium py-4 text-center">No hay productos vendidos en este periodo.</p>
          ) : (
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {mStats.top_products.slice(0, 10).map((prod, idx) => (
                <div key={prod.product_name || idx} className="p-3 rounded-2xl bg-[#FEE4D7]/20 dark:bg-[#2A150C] border border-[#D4B28E]/50 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-6 h-6 rounded-full text-white text-[11px] font-black flex items-center justify-center shrink-0 ${idx === 0 ? 'bg-amber-500 shadow-xs' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-amber-700' : 'bg-[#9F6839]'}`}>
                      #{idx + 1}
                    </span>
                    <span className="text-sm font-extrabold text-[#432414] dark:text-[#FEE4D7] truncate">{prod.product_name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-extrabold text-[#9F6839] dark:text-[#DABA8C] block">{prod.total_qty} ud(s)</span>
                    <span className="text-[11px] font-bold text-emerald-600">${prod.total_amount.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top 10 Clientes del Periodo */}
        <div className="bg-white dark:bg-[#201009] border border-[#D4B28E] dark:border-[#9F6839]/40 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#D4B28E]/40">
            <h3 className="text-base font-extrabold text-[#432414] dark:text-[#FEE4D7] flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <span>Top 10 Clientes del Periodo</span>
            </h3>
            <span className="text-xs font-bold text-[#9F6839]">Por total invertido</span>
          </div>

          {!mStats?.top_customers || mStats.top_customers.length === 0 ? (
            <p className="text-xs text-[#9F6839] font-medium py-4 text-center">No hay compras registradas con nombre de cliente este mes.</p>
          ) : (
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {mStats.top_customers.slice(0, 10).map((c, idx) => (
                <div key={c.customer_name || idx} className="p-3 rounded-2xl bg-[#FEE4D7]/20 dark:bg-[#2A150C] border border-[#D4B28E]/50 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-6 h-6 rounded-full text-white text-[11px] font-black flex items-center justify-center shrink-0 ${idx === 0 ? 'bg-emerald-600 shadow-xs' : idx === 1 ? 'bg-emerald-500' : idx === 2 ? 'bg-teal-600' : 'bg-[#9F6839]'}`}>
                      #{idx + 1}
                    </span>
                    <span className="text-sm font-extrabold text-[#432414] dark:text-[#FEE4D7] truncate">{c.customer_name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-extrabold text-emerald-600 block">${c.total_spent.toLocaleString()}</span>
                    <span className="text-[10px] font-bold text-[#9F6839]">{c.orders_count} compra(s)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
