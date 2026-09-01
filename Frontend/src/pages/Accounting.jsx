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
  Building2,
  Trash2,
  Edit2,
  Download,
  FileText,
  Banknote,
  Smartphone,
  CreditCard,
  Tag,
  ArrowDownCircle,
  ArrowUpCircle
} from 'lucide-react'

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
  const [summary, setSummary] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [incomes, setIncomes] = useState([])
  const [activeTab, setActiveTab] = useState('expenses') // 'expenses' | 'incomes' | 'summary'
  const [period, setPeriod] = useState('month')
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')

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
      setExpenses(expData || [])
      setIncomes(incData || [])
    } catch (err) {
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
    setExpDescription(exp.description)
    setExpAmount(String(exp.amount))
    setExpCategory(exp.category || 'otros')
    setExpPaymentMethod(exp.payment_method || 'efectivo')
    setExpDate(getLocalDatetimeString(exp.created_at))
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
    setIncDescription(inc.description)
    setIncAmount(String(inc.amount))
    setIncCategory(inc.category || 'otros')
    setIncPaymentMethod(inc.payment_method || 'efectivo')
    setIncDate(getLocalDatetimeString(inc.created_at))
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

  // Exportar a CSV (Inspirado en Twenty)
  function exportAccountingCSV() {
    let csv = 'Tipo,Fecha,Descripcion,Monto,Categoria,MetodoPago\n'
    expenses.forEach((e) => {
      const d = new Date(e.created_at).toLocaleString('es-CO').replace(',', '')
      csv += `"GASTO","${d}","${e.description}",${e.amount},"${e.category}","${e.payment_method}"\n`
    })
    incomes.forEach((i) => {
      const d = new Date(i.created_at).toLocaleString('es-CO').replace(',', '')
      csv += `"INGRESO","${d}","${i.description}",${i.amount},"${i.category}","${i.payment_method}"\n`
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `Contabilidad_Enchiladitos_${period}_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const totalGastosCalc = useMemo(() => expenses.reduce((acc, e) => acc + (e.amount || 0), 0), [expenses])
  const totalIngresosCalc = useMemo(() => (summary?.total_income || 0), [summary])
  const balanceNetoCalc = useMemo(() => totalIngresosCalc - totalGastosCalc, [totalIngresosCalc, totalGastosCalc])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#1c0707] p-6 rounded-3xl border border-red-200/80 dark:border-red-950/60 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-red-100 dark:bg-red-950 text-red-600 dark:text-amber-400">
              <DollarSign className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-[#450a0a] dark:text-[#fef2f2]">
              Contabilidad & Flujo de Caja
            </h1>
          </div>
          <p className="text-sm font-medium text-red-900/60 dark:text-red-300/60 mt-1">
            Control de ingresos, gastos clasificados, balance neto editable y exportación contable.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportAccountingCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-[#200808] border border-red-200 dark:border-red-950 text-red-700 dark:text-amber-400 font-bold text-xs hover:bg-red-50 cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
          <button
            onClick={openCreateIncome}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Ingreso</span>
          </button>
          <button
            onClick={openCreateExpense}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-black text-xs cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Gasto</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Resumen Financiero */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#1c0707] p-5 rounded-3xl border border-red-200/60 dark:border-red-950/60 flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase text-red-900/50 dark:text-red-400/50">Ingresos Totales</span>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              ${totalIngresosCalc.toLocaleString('es-CO')}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1c0707] p-5 rounded-3xl border border-red-200/60 dark:border-red-950/60 flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-amber-400">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase text-red-900/50 dark:text-red-400/50">Gastos Totales</span>
            <p className="text-2xl font-black text-red-600 dark:text-amber-400">
              ${totalGastosCalc.toLocaleString('es-CO')}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1c0707] p-5 rounded-3xl border border-red-200/60 dark:border-red-950/60 flex items-center gap-4">
          <div
            className={`p-3.5 rounded-2xl ${
              balanceNetoCalc >= 0
                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400'
                : 'bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400'
            }`}
          >
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase text-red-900/50 dark:text-red-400/50">Ganancia Neta</span>
            <p
              className={`text-2xl font-black ${
                balanceNetoCalc >= 0 ? 'text-[#450a0a] dark:text-[#fef2f2]' : 'text-rose-600'
              }`}
            >
              ${balanceNetoCalc.toLocaleString('es-CO')}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs y Selector de Periodo */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-[#1c0707] p-4 rounded-3xl border border-red-200/70 dark:border-red-950/60">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'expenses'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-red-50 dark:bg-[#200808] text-red-950 dark:text-red-200 hover:bg-red-100'
            }`}
          >
            Gastos ({expenses.length})
          </button>
          <button
            onClick={() => setActiveTab('incomes')}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'incomes'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-red-50 dark:bg-[#200808] text-red-950 dark:text-red-200 hover:bg-red-100'
            }`}
          >
            Ingresos Extra ({incomes.length})
          </button>
        </div>

        {/* Periodos */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
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
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                period === p.id
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-red-50/70 dark:bg-[#200808] text-red-950/70 dark:text-red-200/70 hover:bg-red-100/70'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido de la Tabla según Tab */}
      {activeTab === 'expenses' ? (
        <div className="bg-white dark:bg-[#1c0707] rounded-3xl border border-red-200/80 dark:border-red-950/60 overflow-hidden shadow-xs">
          {expenses.length === 0 ? (
            <div className="text-center py-16 p-6">
              <TrendingDown className="w-12 h-12 mx-auto text-red-400/40 mb-3" />
              <p className="text-base font-black text-[#450a0a] dark:text-[#fef2f2]">No hay gastos registrados en este periodo</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-red-200/60 dark:border-red-950/60 bg-red-50/40 dark:bg-[#200808] text-red-950/70 dark:text-red-300/70 font-black uppercase text-[10px] tracking-wider">
                    <th className="p-4">Fecha</th>
                    <th className="p-4">Descripción</th>
                    <th className="p-4">Categoría</th>
                    <th className="p-4">Pago</th>
                    <th className="p-4 text-right">Monto</th>
                    <th className="p-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-100 dark:divide-red-950/50">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-red-50/30 dark:hover:bg-red-950/20 transition-colors">
                      <td className="p-4 font-bold text-[#450a0a] dark:text-[#fef2f2] whitespace-nowrap">
                        {new Date(exp.created_at).toLocaleString('es-CO', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="p-4 font-black text-[#450a0a] dark:text-[#fef2f2]">{exp.description}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-xl bg-red-100/70 dark:bg-red-950 text-red-700 dark:text-amber-400 font-extrabold uppercase text-[10px]">
                          {exp.category}
                        </span>
                      </td>
                      <td className="p-4 font-medium uppercase text-gray-500">{exp.payment_method}</td>
                      <td className="p-4 text-right font-black text-red-600 dark:text-amber-400 text-sm">
                        -${Number(exp.amount).toLocaleString('es-CO')}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditExpense(exp)}
                            className="p-1.5 rounded-xl text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors cursor-pointer"
                            title="Editar Gasto"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(exp)}
                            className="p-1.5 rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 transition-colors cursor-pointer"
                            title="Eliminar Gasto"
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
      ) : (
        <div className="bg-white dark:bg-[#1c0707] rounded-3xl border border-red-200/80 dark:border-red-950/60 overflow-hidden shadow-xs">
          {incomes.length === 0 ? (
            <div className="text-center py-16 p-6">
              <TrendingUp className="w-12 h-12 mx-auto text-emerald-400/40 mb-3" />
              <p className="text-base font-black text-[#450a0a] dark:text-[#fef2f2]">No hay ingresos extra registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-red-200/60 dark:border-red-950/60 bg-red-50/40 dark:bg-[#200808] text-red-950/70 dark:text-red-300/70 font-black uppercase text-[10px] tracking-wider">
                    <th className="p-4">Fecha</th>
                    <th className="p-4">Descripción</th>
                    <th className="p-4">Categoría</th>
                    <th className="p-4">Pago</th>
                    <th className="p-4 text-right">Monto</th>
                    <th className="p-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-100 dark:divide-red-950/50">
                  {incomes.map((inc) => (
                    <tr key={inc.id} className="hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-colors">
                      <td className="p-4 font-bold text-[#450a0a] dark:text-[#fef2f2] whitespace-nowrap">
                        {new Date(inc.created_at).toLocaleString('es-CO', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="p-4 font-black text-[#450a0a] dark:text-[#fef2f2]">{inc.description}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-xl bg-emerald-100/70 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-extrabold uppercase text-[10px]">
                          {inc.category}
                        </span>
                      </td>
                      <td className="p-4 font-medium uppercase text-gray-500">{inc.payment_method}</td>
                      <td className="p-4 text-right font-black text-emerald-600 dark:text-emerald-400 text-sm">
                        +${Number(inc.amount).toLocaleString('es-CO')}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditIncome(inc)}
                            className="p-1.5 rounded-xl text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors cursor-pointer"
                            title="Editar Ingreso"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteIncome(inc)}
                            className="p-1.5 rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 transition-colors cursor-pointer"
                            title="Eliminar Ingreso"
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
      )}

      {/* Modal Crear / Editar Gasto */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title={editingExpense ? 'Editar Gasto' : 'Registrar Nuevo Gasto'}
      >
        <form onSubmit={handleSaveExpense} className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase text-red-950 dark:text-red-200 mb-1">
              Descripción del Gasto *
            </label>
            <input
              type="text"
              required
              value={expDescription}
              onChange={(e) => setExpDescription(e.target.value)}
              placeholder="Ej. Compra de 50 gomitas base, empaques, gas..."
              className="w-full px-4 py-2.5 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200 text-xs font-bold focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-red-950 dark:text-red-200 mb-1">
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
                className="w-full px-4 py-2.5 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200 text-xs font-bold focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-red-950 dark:text-red-200 mb-1">
                Fecha & Hora
              </label>
              <input
                type="datetime-local"
                value={expDate}
                onChange={(e) => setExpDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200 text-xs font-bold focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-red-950 dark:text-red-200 mb-1">
                Categoría
              </label>
              <select
                value={expCategory}
                onChange={(e) => setExpCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200 text-xs font-bold cursor-pointer"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-red-950 dark:text-red-200 mb-1">
                Método de Pago
              </label>
              <select
                value={expPaymentMethod}
                onChange={(e) => setExpPaymentMethod(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200 text-xs font-bold cursor-pointer"
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia / Nequi / Bancolombia</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-red-100 dark:border-red-950">
            <button
              type="button"
              onClick={() => setIsExpenseModalOpen(false)}
              className="px-5 py-2.5 rounded-2xl text-xs font-bold text-red-950/70 hover:bg-red-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={expSubmitting}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 text-white font-black text-xs shadow-md cursor-pointer disabled:opacity-50"
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
            <label className="block text-xs font-black uppercase text-red-950 dark:text-red-200 mb-1">
              Descripción del Ingreso *
            </label>
            <input
              type="text"
              required
              value={incDescription}
              onChange={(e) => setIncDescription(e.target.value)}
              placeholder="Ej. Venta en evento escolar, aporte personal..."
              className="w-full px-4 py-2.5 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200 text-xs font-bold focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-red-950 dark:text-red-200 mb-1">
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
                className="w-full px-4 py-2.5 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200 text-xs font-bold focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-red-950 dark:text-red-200 mb-1">
                Fecha & Hora
              </label>
              <input
                type="datetime-local"
                value={incDate}
                onChange={(e) => setIncDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200 text-xs font-bold focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-red-950 dark:text-red-200 mb-1">
                Categoría
              </label>
              <select
                value={incCategory}
                onChange={(e) => setIncCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200 text-xs font-bold cursor-pointer"
              >
                {INCOME_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-red-950 dark:text-red-200 mb-1">
                Método de Pago
              </label>
              <select
                value={incPaymentMethod}
                onChange={(e) => setIncPaymentMethod(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200 text-xs font-bold cursor-pointer"
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia / Nequi / Bancolombia</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-red-100 dark:border-red-950">
            <button
              type="button"
              onClick={() => setIsIncomeModalOpen(false)}
              className="px-5 py-2.5 rounded-2xl text-xs font-bold text-red-950/70 hover:bg-red-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={incSubmitting}
              className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md cursor-pointer disabled:opacity-50"
            >
              {incSubmitting ? 'Guardando...' : editingIncome ? 'Actualizar Ingreso' : 'Registrar Ingreso'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
