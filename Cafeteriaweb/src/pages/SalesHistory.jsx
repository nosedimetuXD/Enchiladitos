import { useEffect, useState, useMemo } from 'react'
import { api } from '../api/client'
import Modal from '../components/Modal'
import { Search, FileText, Printer, Clock, TrendingUp } from 'lucide-react'

export default function SalesHistory() {
  const [sales, setSales] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMethod, setSelectedMethod] = useState('Todos')
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')

  // Modal Recibo impreso
  const [selectedSale, setSelectedSale] = useState(null)
  const [isReceiptOpen, setIsReceiptOpen] = useState(false)

  async function loadSales() {
    try {
      const data = await api.get('/sales')
      setSales(data || [])
    } catch (err) {
      setPageError('No se pudo cargar el historial de ventas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSales()
  }, [])

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const matchSearch =
        s.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.sold_by_username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(s.id).includes(searchQuery)

      const matchMethod = selectedMethod === 'Todos' || s.payment_method === selectedMethod
      return matchSearch && matchMethod
    })
  }, [sales, searchQuery, selectedMethod])

  const totalSalesVolume = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + s.total, 0)
  }, [filteredSales])

  function handlePrintReceipt(sale) {
    setSelectedSale(sale)
    setIsReceiptOpen(true)
  }

  function executeBrowserPrint() {
    window.print()
  }

  if (loading) return <p className="p-4 text-sm font-semibold text-[#9F6839]">Cargando historial de ventas...</p>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#432414] dark:text-[#FEE4D7] tracking-tight">
            Historial de Ventas & Recibos
          </h2>
          <p className="text-xs font-semibold text-[#9F6839] dark:text-[#DABA8C] mt-0.5">
            Registro cronológico de ventas, cobros y comprobantes de la cafetería
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white dark:bg-[#201009] border border-[#D4B28E] dark:border-[#9F6839]/40 px-4 py-2.5 rounded-3xl shadow-xs">
          <div className="p-2 rounded-2xl bg-[#432414] text-[#DABA8C]">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-[#9F6839] uppercase font-bold tracking-wider block">Total Facturado</span>
            <div className="text-lg font-extrabold text-[#432414] dark:text-[#FEE4D7]">
              ${totalSalesVolume.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {pageError && (
        <div className="p-3.5 rounded-2xl bg-red-50 text-red-700 border border-red-200 text-xs font-bold">
          ⚠️ {pageError}
        </div>
      )}

      {/* Buscador & Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9F6839]" />
          <input
            type="text"
            placeholder="Buscar por cliente, cajero o ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-[#201009] border border-[#D4B28E] dark:border-[#9F6839]/40 focus:border-[#9F6839] rounded-2xl pl-10 pr-3 py-2.5 text-xs font-semibold text-[#432414] dark:text-[#FEE4D7] focus:outline-none shadow-xs"
          />
        </div>

        <select
          value={selectedMethod}
          onChange={(e) => setSelectedMethod(e.target.value)}
          className="bg-white dark:bg-[#201009] border border-[#D4B28E] dark:border-[#9F6839]/40 rounded-2xl px-3 py-2.5 text-xs font-bold text-[#432414] dark:text-[#FEE4D7] focus:outline-none shadow-xs cursor-pointer"
        >
          <option value="Todos">Todos los Métodos de Pago</option>
          <option value="efectivo">💵 Efectivo</option>
          <option value="transferencia">📱 Transferencia</option>
          <option value="mixto">💳 Pago Mixto</option>
        </select>
      </div>

      {/* Tabla de Historial de Ventas */}
      <div className="bg-white dark:bg-[#201009] border border-[#D4B28E] dark:border-[#9F6839]/40 rounded-3xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FEE4D7]/50 dark:bg-[#2A150C] text-[#9F6839] dark:text-[#DABA8C] uppercase tracking-wider text-[10px] border-b border-[#D4B28E]/60 font-bold">
              <tr>
                <th className="py-3.5 px-4">ID Venta</th>
                <th className="py-3.5 px-4">Fecha / Hora</th>
                <th className="py-3.5 px-4">Cliente</th>
                <th className="py-3.5 px-4">Método de Pago</th>
                <th className="py-3.5 px-4">Atendido Por</th>
                <th className="py-3.5 px-4 text-right">Total</th>
                <th className="py-3.5 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D4B28E]/30 text-[#432414] dark:text-[#FEE4D7]">
              {filteredSales.map((s) => (
                <tr key={s.id} className="hover:bg-[#FEE4D7]/30 transition-colors">
                  <td className="py-3.5 px-4 font-extrabold text-[#432414] dark:text-[#FEE4D7]">
                    #{s.id.slice(0, 8)}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-[#9F6839] dark:text-[#DABA8C]">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(s.created_at).toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-bold">{s.customer_name || 'Cliente General'}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#FEE4D7] dark:bg-[#34180D] text-[#9F6839] dark:text-[#DABA8C] border border-[#D4B28E] font-extrabold text-[10px]">
                      {s.payment_method === 'efectivo' ? '💵 Efectivo' : s.payment_method === 'transferencia' ? '📱 Transferencia' : '💳 Mixto'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold">{s.sold_by_username || 'Vendedor'}</td>
                  <td className="py-3.5 px-4 text-right font-extrabold text-sm text-emerald-600">
                    ${s.total.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => handlePrintReceipt(s)}
                      className="p-2 rounded-xl text-[#9F6839] hover:bg-[#FEE4D7] dark:hover:bg-[#2E180E] transition-colors cursor-pointer"
                      title="Imprimir / Ver Ticket"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-[#9F6839] font-medium">
                    No se encontraron ventas registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Recibo Impreso */}
      <Modal isOpen={isReceiptOpen} onClose={() => setIsReceiptOpen(false)} title="Recibo de Venta Toffe">
        {selectedSale && (
          <div className="space-y-4">
            <div id="printable-receipt" className="p-6 bg-white border border-gray-200 rounded-2xl text-center space-y-3 font-mono text-xs text-gray-800">
              <div className="border-b pb-3">
                <h2 className="text-lg font-bold">☕ TOFFE COFFEE</h2>
                <p className="text-[10px] text-gray-500">"Hecho por y para estudiantes"</p>
                <p className="text-[10px] text-gray-500 mt-1">Venta #{selectedSale.id.slice(0, 8)}</p>
                <p className="text-[10px] text-gray-500">{new Date(selectedSale.created_at).toLocaleString()}</p>
              </div>

              <div className="text-left space-y-1 text-xs">
                <div><strong>Cliente:</strong> {selectedSale.customer_name || 'Cliente General'}</div>
                <div><strong>Forma Pago:</strong> {selectedSale.payment_method}</div>
                <div><strong>Cajero:</strong> {selectedSale.sold_by_username || 'Caja'}</div>
              </div>

              <div className="border-t border-b py-3 space-y-1 text-left">
                {(selectedSale.items || []).map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{it.quantity}x {it.product_name}</span>
                    <span className="font-bold">${(it.unit_price * it.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between text-sm font-extrabold pt-2">
                <span>TOTAL PAGADO:</span>
                <span>${selectedSale.total.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsReceiptOpen(false)}
                className="px-4 py-2.5 rounded-2xl bg-white border border-gray-300 text-xs font-bold cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={executeBrowserPrint}
                className="px-5 py-2.5 rounded-2xl bg-[#9F6839] text-white text-xs font-extrabold shadow-md cursor-pointer inline-flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> Imprimir Comprobante
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
