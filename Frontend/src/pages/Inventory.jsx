import { useEffect, useState } from 'react'
import { api } from '../api/client'
import Modal from '../components/Modal'
import { useAuth } from '../context/AuthContext'
import { AVAILABLE_UNITS, convertQuantity } from '../utils/unitConverter'
import { Package, Plus, Minus, AlertTriangle, Search, Edit2, ShieldAlert, DollarSign, Trash2, Building2 } from 'lucide-react'

export default function Inventory() {
  const { user } = useAuth()
  const userRole = (user?.role || '').toLowerCase()
  const isEmployee = userRole === 'empleado' || userRole === 'employee' || !['owner', 'admin'].includes(userRole)

  const [ingredients, setIngredients] = useState([])
  const [wasteReports, setWasteReports] = useState([])
  const [activeTab, setActiveTab] = useState('inventory')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')

  // Modal Crear / Editar Insumo
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingIngredient, setEditingIngredient] = useState(null)
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('g')
  const [minQuantity, setMinQuantity] = useState('50')
  const [unitCost, setUnitCost] = useState('0')
  const [addAsExpense, setAddAsExpense] = useState(false)
  const [expensePaymentMethod, setExpensePaymentMethod] = useState('efectivo')
  const [expenseCashAmount, setExpenseCashAmount] = useState('')
  const [expenseBankLines, setExpenseBankLines] = useState([{ bank: 'Bre-B/Llave', amount: '' }])

  function addExpenseBankLine() {
    setExpenseBankLines((prev) => [...prev, { bank: 'Bre-B/Llave', amount: '' }])
  }

  function removeExpenseBankLine(index) {
    if (expenseBankLines.length <= 1) return
    setExpenseBankLines((prev) => prev.filter((_, i) => i !== index))
  }

  function updateExpenseBankLine(index, field, value) {
    setExpenseBankLines((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  // Modal Reportar Daño / Merma
  const [isWasteModalOpen, setIsWasteModalOpen] = useState(false)
  const [wasteIngredientId, setWasteIngredientId] = useState('')
  const [wasteQuantity, setWasteQuantity] = useState('')
  const [wasteUnit, setWasteUnit] = useState('g')
  const [wasteReason, setWasteReason] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  async function loadData() {
    try {
      const [ingData, wasteData] = await Promise.all([
        api.get('/ingredients'),
        api.get('/waste')
      ])
      setIngredients(ingData || [])
      setWasteReports(wasteData || [])
    } catch (err) {
      setPageError('No se pudo cargar el inventario')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function openCreateModal() {
    setEditingIngredient(null)
    setName('')
    setQuantity('')
    setUnit('g')
    setMinQuantity('50')
    setUnitCost('0')
    setAddAsExpense(false)
    setExpensePaymentMethod('efectivo')
    setExpenseCashAmount('')
    setExpenseBankLines([{ bank: 'Bre-B/Llave', amount: '' }])
    setFormError('')
    setIsModalOpen(true)
  }

  function openEditModal(ing) {
    setEditingIngredient(ing)
    setName(ing.name)
    setQuantity(String(ing.quantity))
    setUnit(ing.unit)
    setMinQuantity(String(ing.min_quantity ?? 50))
    setUnitCost(String(ing.unit_cost ?? 0))
    setAddAsExpense(false)
    setFormError('')
    setIsModalOpen(true)
  }

  function openWasteModal() {
    if (ingredients.length === 0) {
      alert('No hay insumos registrados para reportar mermas.')
      return
    }
    setWasteIngredientId(ingredients[0]?.id || '')
    setWasteQuantity('')
    setWasteUnit(ingredients[0]?.unit || 'g')
    setWasteReason('')
    setFormError('')
    setIsWasteModalOpen(true)
  }

  async function handleSubmitIngredient(e) {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')

    try {
      const payload = {
        name,
        quantity: Number(quantity),
        unit,
        min_quantity: Number(minQuantity),
        unit_cost: Number(unitCost) || 0
      }

      if (editingIngredient) {
        await api.put(`/ingredients/${editingIngredient.id}`, payload)
      } else {
        const createdIng = await api.post('/ingredients', payload)
        if (addAsExpense && (Number(quantity) * Number(unitCost)) > 0) {
          const totalExpenseAmount = Number(quantity) * Number(unitCost)

          let finalPaymentMethod = expensePaymentMethod
          const bankParts = expenseBankLines
            .filter((l) => l.bank.trim() !== '')
            .map((l) => (l.amount ? `${l.bank.trim()} ($${Number(l.amount).toLocaleString()})` : l.bank.trim()))

          if (expensePaymentMethod === 'transferencia') {
            finalPaymentMethod = bankParts.length > 0 ? `transferencia: ${bankParts.join(' + ')}` : 'transferencia'
          } else if (expensePaymentMethod === 'mixto') {
            const cashPart = expenseCashAmount ? `$${Number(expenseCashAmount).toLocaleString()} Efectivo` : 'Efectivo'
            const bankStr = bankParts.length > 0 ? bankParts.join(' + ') : 'Transferencia'
            finalPaymentMethod = `mixto (${cashPart} + ${bankStr})`
          }

          await api.post('/expenses', {
            description: `Compra inicial de insumo: ${name} (${quantity} ${unit})`,
            amount: totalExpenseAmount,
            category: 'insumos',
            payment_method: finalPaymentMethod,
            ingredient_id: createdIng?.id || null,
            quantity_added: 0
          })
        }
      }

      setIsModalOpen(false)
      await loadData()
    } catch (err) {
      setFormError(err.message || 'No se pudo guardar el insumo')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteIngredient(ing) {
    if (isEmployee) return
    if (!window.confirm(`¿Estás seguro de eliminar el insumo "${ing.name}"? Se quitará de las recetas y del inventario.`)) {
      return
    }
    try {
      await api.delete(`/ingredients/${ing.id}`)
      await loadData()
    } catch (err) {
      alert(err.message || 'Error al eliminar el insumo')
    }
  }

  async function quickAdjustStock(ing, delta) {
    if (isEmployee) return
    const newQty = Math.max(0, (ing.quantity || 0) + delta)
    try {
      await api.put(`/ingredients/${ing.id}`, {
        name: ing.name,
        unit: ing.unit,
        quantity: newQty,
        min_quantity: ing.min_quantity,
        unit_cost: ing.unit_cost
      })
      await loadData()
    } catch (err) {
      alert('No se pudo ajustar el stock')
    }
  }

  const selectedWasteIng = ingredients.find((i) => i.id === wasteIngredientId)
  const convertedWasteQuantity = selectedWasteIng && Number(wasteQuantity) > 0
    ? convertQuantity(wasteQuantity, wasteUnit, selectedWasteIng.unit)
    : Number(wasteQuantity) || 0

  const estimatedWasteLoss = selectedWasteIng && convertedWasteQuantity > 0
    ? convertedWasteQuantity * (selectedWasteIng.unit_cost || 0)
    : 0

  async function handleSubmitWaste(e) {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')

    try {
      await api.post('/waste', {
        ingredient_id: wasteIngredientId,
        user_quantity: Number(wasteQuantity),
        user_unit: wasteUnit,
        reason: wasteReason
      })

      setIsWasteModalOpen(false)
      await loadData()
    } catch (err) {
      setFormError(err.message || 'No se pudo registrar el reporte de merma')
    } finally {
      setSubmitting(false)
    }
  }

  const lowStockCount = ingredients.filter((i) => i.quantity <= i.min_quantity).length
  const filteredIngredients = ingredients.filter((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()))

  if (loading) return <p className="p-4 text-sm font-semibold text-red-600">Cargando inventario...</p>

  return (
    <div className="space-y-6">
      {/* Header Page Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-red-200/60 dark:border-red-950">
        <div>
          <h2 className="text-2xl font-black text-[#450a0a] dark:text-[#fef2f2] tracking-tight">
            Control de Inventario & Reporte de Mermas
          </h2>
          <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-1">
            Existencias de insumos (chamoy, tajín, empaques, gomitas), costos y registro de daños
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openWasteModal}
            className="px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Reportar Daño / Merma</span>
          </button>

          {!isEmployee && (
            <button
              onClick={openCreateModal}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white text-xs font-black flex items-center gap-2 shadow-md transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Insumo</span>
            </button>
          )}
        </div>
      </div>

      {pageError && (
        <div className="p-3.5 rounded-2xl bg-red-50 text-red-700 border border-red-200 text-xs font-bold">
          ⚠️ {pageError}
        </div>
      )}

      {/* Alerta de Stock Bajo */}
      {lowStockCount > 0 && (
        <div className="p-4 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
          <div>
            <span className="font-black text-sm block">¡Alerta de Inventario Bajo!</span>
            <span>
              Tienes {lowStockCount} insumo(s) por debajo de su stock mínimo configurado.
            </span>
          </div>
        </div>
      )}

      {/* Buscador & Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-red-500" />
          <input
            type="text"
            placeholder="Buscar insumo (ej. Chamoy, Tajín, Gomitas, Vasos)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-[#1c0707] border border-red-200 dark:border-red-950 focus:border-red-500 rounded-2xl pl-10 pr-3 py-2.5 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] focus:outline-none shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2 border-b border-red-200/60 dark:border-red-950 pb-2 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'inventory'
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-xs'
                : 'bg-white dark:bg-[#1c0707] border border-red-200 text-[#450a0a] dark:text-[#fef2f2]'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Existencias ({ingredients.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('waste')}
            className={`px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'waste'
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-xs'
                : 'bg-white dark:bg-[#1c0707] border border-red-200 text-[#450a0a] dark:text-[#fef2f2]'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            <span>Reportes de Mermas ({wasteReports.length})</span>
          </button>
        </div>
      </div>

      {/* Pestaña 1: Tabla de Insumos */}
      {activeTab === 'inventory' && (
        <div className="bg-white dark:bg-[#1c0707] border border-red-200 dark:border-red-950/60 rounded-3xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-xs">
              <thead className="bg-red-50/70 dark:bg-[#240a0a] text-red-700 dark:text-amber-300 uppercase tracking-wider text-[10px] border-b border-red-200 dark:border-red-950 font-black">
                <tr>
                  <th className="py-3.5 px-4">Insumo</th>
                  <th className="py-3.5 px-4">Stock</th>
                  <th className="py-3.5 px-4">Costo/u</th>
                  <th className="py-3.5 px-4">Mínimo</th>
                  <th className="py-3.5 px-4">Estado</th>
                  {!isEmployee && <th className="py-3.5 px-4 text-center">Ajuste Rápido</th>}
                  {!isEmployee && <th className="py-3.5 px-4 text-center">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100 dark:divide-red-950/50 text-[#450a0a] dark:text-[#fef2f2]">
                {filteredIngredients.map((ing) => {
                  const isLow = ing.quantity <= ing.min_quantity
                  return (
                    <tr key={ing.id} className={isLow ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''}>
                      <td className="py-3.5 px-4 font-black">{ing.name}</td>
                      <td className="py-3.5 px-4 font-black text-sm">
                        {ing.quantity} <span className="text-xs font-bold text-amber-600">{ing.unit}</span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-600">
                        ${(ing.unit_cost || 0).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-amber-600 font-bold">{ing.min_quantity}</td>
                      <td className="py-3.5 px-4">
                        {isLow ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-[10px] font-bold">¡Bajo!</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold">OK</span>
                        )}
                      </td>
                      {!isEmployee && (
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex justify-center gap-1">
                            <button onClick={() => quickAdjustStock(ing, -1)} className="p-1 rounded-lg bg-red-100 dark:bg-red-950 text-red-600 hover:bg-red-200 cursor-pointer font-bold"><Minus className="w-3 h-3" /></button>
                            <button onClick={() => quickAdjustStock(ing, 1)} className="p-1 rounded-lg bg-red-100 dark:bg-red-950 text-red-600 hover:bg-red-200 cursor-pointer font-bold"><Plus className="w-3 h-3" /></button>
                          </div>
                        </td>
                      )}
                      {!isEmployee && (
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openEditModal(ing)}
                              className="p-2 rounded-xl text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                              title="Editar insumo"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteIngredient(ing)}
                              className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                              title="Eliminar insumo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
                {filteredIngredients.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-red-400 font-bold">
                      No se encontraron insumos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pestaña 2: Historial de Reportes de Mermas */}
      {activeTab === 'waste' && (
        <div className="bg-white dark:bg-[#1c0707] border border-red-200 dark:border-red-950/60 rounded-3xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="bg-red-50/70 dark:bg-[#240a0a] text-red-700 dark:text-amber-300 uppercase tracking-wider text-[10px] border-b border-red-200 dark:border-red-950 font-black">
                <tr>
                  <th className="py-3.5 px-4">Fecha / Hora</th>
                  <th className="py-3.5 px-4">Insumo</th>
                  <th className="py-3.5 px-4">Cantidad Reportada</th>
                  <th className="py-3.5 px-4">Descontado</th>
                  <th className="py-3.5 px-4 text-right">Pérdida Estimada ($)</th>
                  <th className="py-3.5 px-4">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100 dark:divide-red-950/50 text-[#450a0a] dark:text-[#fef2f2]">
                {wasteReports.map((w) => (
                  <tr key={w.id}>
                    <td className="py-3.5 px-4 font-semibold text-red-500">
                      {new Date(w.created_at).toLocaleString('es-CO')}
                    </td>
                    <td className="py-3.5 px-4 font-black">{w.ingredient_name || 'Insumo'}</td>
                    <td className="py-3.5 px-4 font-black text-amber-600 dark:text-amber-400">
                      {w.quantity_lost} {w.unit || 'g'}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-red-600">
                      -{w.quantity_lost} {w.unit || 'g'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-red-600 text-sm">
                      -${(w.estimated_loss || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 italic text-[#450a0a]/80 dark:text-[#fef2f2]/80">{w.reason}</td>
                  </tr>
                ))}
                {wasteReports.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-red-400 font-bold">
                      No hay mermas reportadas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Reportar Daño / Merma */}
      <Modal isOpen={isWasteModalOpen} onClose={() => setIsWasteModalOpen(false)} title="Reportar Daño o Pérdida de Insumo">
        <form onSubmit={handleSubmitWaste} className="space-y-4">
          {formError && (
            <div className="p-3.5 rounded-2xl bg-red-50 text-red-700 border border-red-200 text-xs font-bold">
              ⚠️ {formError}
            </div>
          )}
          <div>
            <label className="block text-xs font-black text-[#450a0a] dark:text-amber-300 uppercase tracking-wider mb-1">Insumo Afectado</label>
            <select
              value={wasteIngredientId}
              onChange={(e) => setWasteIngredientId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#140505] border border-red-200 dark:border-red-950 text-sm font-bold text-[#450a0a] dark:text-[#fef2f2]"
            >
              {ingredients.map((ing) => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
             <input type="number" step="0.01" value={wasteQuantity} onChange={(e) => setWasteQuantity(e.target.value)} placeholder="Cantidad" required className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#140505] border border-red-200 text-xs font-bold" />
             <select value={wasteUnit} onChange={(e) => setWasteUnit(e.target.value)} className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#140505] border border-red-200 text-xs font-bold">
                {AVAILABLE_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
             </select>
          </div>
          <div>
            <label className="block text-xs font-black text-[#450a0a] dark:text-amber-300 uppercase tracking-wider mb-1">Motivo / Razón del Daño</label>
            <textarea
              value={wasteReason}
              onChange={(e) => setWasteReason(e.target.value)}
              placeholder="Ej. Se derramó el chamoy, empaque abierto, vencimiento..."
              required
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#140505] border border-red-200 dark:border-red-950 text-sm font-semibold text-[#450a0a] dark:text-[#fef2f2]"
            />
          </div>
          {estimatedWasteLoss > 0 && (
            <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 flex items-center justify-between text-xs">
              <span className="font-black text-red-800 dark:text-red-300">Pérdida Financiera Estimada:</span>
              <strong className="text-sm font-black text-red-600">-${estimatedWasteLoss.toLocaleString()}</strong>
            </div>
          )}
          <div className="flex gap-3 justify-end pt-3">
            <button type="button" onClick={() => setIsWasteModalOpen(false)} className="px-4 py-2.5 rounded-2xl bg-white dark:bg-[#1c0707] border border-red-200 text-xs font-bold">Cancelar</button>
            <button type="submit" disabled={submitting} className="px-5 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-md cursor-pointer">
              {submitting ? 'Registrando...' : 'Registrar Pérdida'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Crear / Editar Insumo */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingIngredient ? 'Editar Insumo' : 'Nuevo Insumo'}>
        <form onSubmit={handleSubmitIngredient} className="space-y-4">
          {formError && (
            <div className="p-3.5 rounded-2xl bg-red-50 text-red-700 border border-red-200 text-xs font-bold">
              ⚠️ {formError}
            </div>
          )}
          <div>
            <label className="block text-xs font-black text-[#450a0a] dark:text-amber-300 uppercase tracking-wider mb-1">Nombre del Insumo</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Chamoy Líquido 1L, Tajín 500g" required className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#140505] border border-red-200 dark:border-red-950 text-sm font-bold text-[#450a0a] dark:text-[#fef2f2]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
             <div>
               <label className="block text-[11px] font-black text-[#450a0a] dark:text-amber-300 uppercase mb-1">Cantidad Inicial</label>
               <input type="number" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Cantidad" required className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#140505] border border-red-200 text-sm font-bold text-[#450a0a] dark:text-[#fef2f2]" />
             </div>
             <div>
               <label className="block text-[11px] font-black text-[#450a0a] dark:text-amber-300 uppercase mb-1">Unidad de Medida</label>
               <select value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#140505] border border-red-200 text-sm font-bold text-[#450a0a] dark:text-[#fef2f2]">
                  {AVAILABLE_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
               </select>
             </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
             <div>
               <label className="block text-[11px] font-black text-[#450a0a] dark:text-amber-300 uppercase mb-1">Costo Unitario ($)</label>
               <input type="number" step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} placeholder="Costo por unidad" required className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#140505] border border-red-200 text-sm font-bold text-[#450a0a] dark:text-[#fef2f2]" />
             </div>
             <div>
               <label className="block text-[11px] font-black text-[#450a0a] dark:text-amber-300 uppercase mb-1">Stock Mínimo Alerta</label>
               <input type="number" step="0.01" value={minQuantity} onChange={(e) => setMinQuantity(e.target.value)} placeholder="Stock Mínimo" required className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#140505] border border-red-200 text-sm font-bold text-[#450a0a] dark:text-[#fef2f2]" />
             </div>
          </div>

          {!editingIngredient && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-[#240a0a] border border-red-200 dark:border-red-950 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="addAsExpense"
                  checked={addAsExpense}
                  onChange={(e) => setAddAsExpense(e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded cursor-pointer"
                />
                <label htmlFor="addAsExpense" className="text-xs font-black text-[#450a0a] dark:text-[#fef2f2] cursor-pointer select-none">
                  Registrar compra inicial como gasto en Contabilidad (${(Number(quantity || 0) * Number(unitCost || 0)).toLocaleString()})
                </label>
              </div>

              {addAsExpense && (
                <div className="pt-2 border-t border-red-200 dark:border-red-950 space-y-3">
                  <div>
                    <label className="block text-[11px] font-black text-red-600 dark:text-amber-300 uppercase tracking-wider mb-1">
                      Forma de Pago del Gasto
                    </label>
                    <select
                      value={expensePaymentMethod}
                      onChange={(e) => setExpensePaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#140505] border border-red-200 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2]"
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="mixto">Pago Mixto</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 rounded-2xl bg-white dark:bg-[#1c0707] border border-red-200 text-xs font-bold cursor-pointer">Cancelar</button>
            <button type="submit" disabled={submitting} className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white text-xs font-black shadow-md cursor-pointer disabled:opacity-50">
              {submitting ? 'Guardando...' : editingIngredient ? 'Actualizar' : 'Crear Insumo'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}