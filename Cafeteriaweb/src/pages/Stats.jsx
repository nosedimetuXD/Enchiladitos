import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Award, Flame, Users, Calendar } from 'lucide-react'

export default function Stats() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')

  async function loadStats() {
    try {
      const data = await api.get('/accounting/summary?period=month')
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
              <span>Estadísticas Ejecutivas & Reporte Mensual</span>
            </h2>
            <p className="text-xs font-semibold text-[#DABA8C] mt-1">
              Dashboard exclusivo del dueño con ranking de ventas, productos estrella y clientes top
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold text-white">
            <Calendar className="w-4 h-4 text-[#DABA8C]" />
            <span>Mes Actual</span>
          </div>
        </div>
      </div>

      {pageError && (
        <div className="p-3.5 rounded-2xl bg-red-50 text-red-700 border border-red-200 text-xs font-bold">
          ⚠️ {pageError}
        </div>
      )}

      {/* Tarjetas KPI Financieras Exec */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#201009] border border-[#D4B28E] dark:border-[#9F6839]/40 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-[#9F6839] dark:text-[#DABA8C] mb-2">
            <span>Ventas del Mes</span>
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
            <span>Gastos del Mes</span>
            <TrendingDown className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-extrabold text-red-600">
            ${(mStats?.monthly_expenses || 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-[#9F6839] dark:text-[#DABA8C] mt-1 font-semibold">
            Egresos operativos del mes
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
            <span>🥇 Mejor Vendedor</span>
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

      {/* Rankings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Producto Más Vendido */}
        <div className="bg-white dark:bg-[#201009] border border-[#D4B28E] dark:border-[#9F6839]/40 rounded-3xl p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#D4B28E]/40 mb-4">
            <h3 className="text-base font-extrabold text-[#432414] dark:text-[#FEE4D7] flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-600" /> Producto Más Vendido del Mes
            </h3>
          </div>
          {mStats?.top_product ? (
            <div className="p-4 rounded-2xl bg-[#FEE4D7]/40 dark:bg-[#2E180E] border border-[#D4B28E]">
              <div className="text-xl font-extrabold text-[#432414] dark:text-[#FEE4D7]">
                {mStats.top_product.product_name}
              </div>
              <div className="text-xs font-semibold text-[#9F6839] dark:text-[#DABA8C] mt-2">
                Cantidad Vendida: <strong className="text-[#432414] dark:text-[#FEE4D7]">{mStats.top_product.total_qty} unidades</strong>
              </div>
              <div className="text-xs font-semibold text-[#9F6839] dark:text-[#DABA8C] mt-1">
                Ingreso Generado: <strong className="text-emerald-600">${mStats.top_product.total_amount.toLocaleString()}</strong>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#9F6839]">Sin datos de productos este mes</p>
          )}
        </div>

        {/* Top 5 Clientes */}
        <div className="bg-white dark:bg-[#201009] border border-[#D4B28E] dark:border-[#9F6839]/40 rounded-3xl p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#D4B28E]/40 mb-4">
            <h3 className="text-base font-extrabold text-[#432414] dark:text-[#FEE4D7] flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" /> Top 5 Clientes que Más Compraron
            </h3>
          </div>
          {mStats?.top_customers && mStats.top_customers.length > 0 ? (
            <div className="space-y-2">
              {mStats.top_customers.map((c, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-[#FEE4D7]/30 dark:bg-[#2E180E] border border-[#D4B28E]/60 text-xs">
                  <span className="font-bold text-[#432414] dark:text-[#FEE4D7]">
                    <span className="text-[#9F6839] mr-2">#{idx + 1}</span>
                    {c.customer_name}
                  </span>
                  <span className="font-extrabold text-emerald-600">
                    ${c.total_spent.toLocaleString()} <span className="text-[10px] text-[#9F6839] font-normal">({c.orders_count} ord)</span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#9F6839]">Sin clientes registrados este mes</p>
          )}
        </div>
      </div>
    </div>
  )
}
