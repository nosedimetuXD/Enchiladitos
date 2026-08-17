import { useEffect, useState } from 'react'
import { api } from '../api/client'
import Modal from '../components/Modal'
import { AVAILABLE_UNITS, convertQuantity, formatConvertedHint } from '../utils/unitConverter'
import { Package, Plus, Minus, AlertTriangle, Search, Edit2, ShieldAlert, History, DollarSign, ArrowRightLeft } from 'lucide-react'

export default function Inventory() {
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
  const [unit, setUnit] = useState('L')
  const [minQuantity, setMinQuantity] = useState('5')
  const [unitCost, setUnitCost] = useState('0')

  // Modal Reportar Daño / Merma
  const [isWasteModalOpen, setIsWasteModalOpen] = useState(false)
  const [wasteIngredientId, setWasteIngredientId] = useState('')
  const [wasteQuantity, setWasteQuantity] = useState('')
  const [wasteUnit, setWasteUnit] = useState('ml')
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
      setPageError('No se pudieron cargar los datos de inventario')
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
    setUnit('L')
    setMinQuantity('5')
    setUnitCost('0')
    setFormError('')
    setIsModalOpen(true)
  }

  function openEditModal(ing) {
    setEditingIngredient(ing)
    setName(ing.name)
    setQuantity(String(ing.quantity))
    setUnit(ing.unit || 'L')
    setMinQuantity(String(ing.min_quantity ?? 5))
    setUnitCost(String(ing.unit_cost ?? 0))
    setFormError('')
    setIsModalOpen(true)
  }

  function openWasteModal() {
    const firstIng = ingredients.length > 0 ? ingredients[0] : null
    setWasteIngredientId(firstIng ? firstIng.id : '')
    setWasteQuantity('')
    setWasteUnit(firstIng && firstIng.unit === 'L' ? 'ml' : firstIng ? firstIng.unit : 'ml')
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
        await api.post('/ingredients', payload)
      }

      setIsModalOpen(false)
      await loadData()
    } catch (err) {
      setFormError(err.message || 'No se pudo guardar el insumo')
    } finally {
      setSubmitting(false)
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

    if (!wasteIngredientId) {
      setFormError('Selecciona el insumo afectado')
      setSubmitting(false)
      return
    }

    const rawQty = Number(wasteQuantity)
    if (!rawQty || rawQty <= 0) {
      setFormError('La cantidad perdida debe ser mayor a 0')
      setSubmitting(false)
      return
    }

    if (!wasteReason.trim()) {
      setFormError('Ingresa el motivo o razón del daño')
      setSubmitting(false)
      return
    }

    try {
      const targetUnit = selectedWasteIng ? selectedWasteIng.unit : wasteUnit
      const reasonDetail = wasteUnit.toLowerCase() !== targetUnit.toLowerCase()
        ? `${wasteReason.trim()} (${wasteQuantity} ${wasteUnit})`
        : wasteReason.trim()

      await api.post('/waste', {
        ingredient_id: wasteIngredientId,
        quantity_lost: convertedWasteQuantity,
        reason: reasonDetail
      })

      setIsWasteModalOpen(false)
      await loadData()
    } catch (err) {
      setFormError(err.message || 'No se pudo registrar la merma')
    } finally {
      setSubmitting(false)
    }
  }

  async function quickAdjustStock(ing, delta) {
    try {
      const newQty = Math.max(0, Number(ing.quantity) + delta)
      await api.put(`/ingredients/${ing.id}`, {
        name: ing.name,
        quantity: newQty,
        unit: ing.unit,
        min_quantity: ing.min_quantity,
        unit_cost: ing.unit_cost || 0
      })
      await loadData()
    } catch (err) {
      alert('No se pudo ajustar el stock')
    }
  }

  const lowStockCount = ingredients.filter((i) => i.quantity <= i.min_quantity).length
  const filteredIngredients = ingredients.filter((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()))

  if (loading) return <p className="p-4 text-sm font-semibold text-[#9F6839]">Cargando inventario...</p>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#432414] dark:text-[#FEE4D7] tracking-tight">
            Control de Inventario & Reporte de Mermas
          </h2>
          <p className="text-xs font-semibold text-[#9F6839] dark:text-[#DABA8C] mt-0.5">
            Existencias, alertas de stock mínimo, costos por unidad y registro unificado de daños
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openWasteModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Reportar Daño / Merma</span>
          </button>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#9F6839] hover:bg-[#835229] text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Insumo</span>
          </button>
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
            <span className="font-extrabold text-sm block">¡Alerta de Inventario Bajo!</span>
            <span>
              Tienes {lowStockCount} insumo(s) por debajo de su stock mínimo configurado. Considera realizar reabastecimiento en Contabilidad.
            </span>
          </div>
        </div>
      )}

      {/* Buscador */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9F6839]" />
          <input
            type="text"
            placeholder="Buscar insumo por nombre (ej. Café, Leche, Vaso)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-[#201009] border border-[#D4B28E] dark:border-[#9F6839]/40 focus:border-[#9F6839] rounded-2xl pl-10 pr-3 py-2.5 text-xs font-semibold text-[#432414] dark:text-[#FEE4D7] focus:outline-none shadow-xs"
          />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-[#D4B28E]/40 pb-2 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'inventory'
                ? 'bg-[#9F6839] text-white shadow-xs'
                : 'bg-white dark:bg-[#201009] border border-[#D4B28E] text-[#432414] dark:text-[#FEE4D7]'
            }`}
          >
            <Package className="w-3.5 h-3.5 text-[#9F6839] group-hover:text-white" />
            <span>Existencias ({ingredients.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('waste')}
            className={`px-4 py-2 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'waste'
                ? 'bg-[#9F6839] text-white shadow-xs'
                : 'bg-white dark:bg-[#201009] border border-[#D4B28E] text-[#432414] dark:text-[#FEE4D7]'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            <span>Reportes de Mermas ({wasteReports.length})</span>
          </button>
        </div>
      </div>

      {/* Pestaña 1: Tabla de Insumos */}
      {activeTab === 'inventory' && (
        <div className="bg-white dark:bg-[#201009] border border-[#D4B28E] dark:border-[#9F6839]/40 rounded-3xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-xs">
              <thead className="bg-[#FEE4D7]/50 dark:bg-[#2A150C] text-[#9F6839] dark:text-[#DABA8C] uppercase tracking-wider text-[10px] border-b border-[#D4B28E]/60 font-bold">
                <tr>
                  <th className="py-3.5 px-4">Insumo / Materia Prima</th>
                  <th className="py-3.5 px-4">Stock Actual</th>
                  <th className="py-3.5 px-4">Costo / Unidad ($)</th>
                  <th className="py-3.5 px-4">Mínimo Requerido</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4 text-center">Ajuste Rápido</th>
                  <th className="py-3.5 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D4B28E]/30 text-[#432414] dark:text-[#FEE4D7]">
                {filteredIngredients.map((ing) => {
                  const isLow = ing.quantity <= ing.min_quantity
                  return (
                    <tr key={ing.id} className={isLow ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''}>
                      <td className="py-3.5 px-4 font-bold">{ing.name}</td>
                      <td className="py-3.5 px-4 font-extrabold text-sm">
                        {ing.quantity} <span className="text-xs font-semibold text-[#9F6839]">{ing.unit}</span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-600">
                        ${(ing.unit_cost || 0).toLocaleString()} <span className="text-[10px] text-[#9F6839] font-normal">/{ing.unit}</span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#9F6839]">
                        {ing.min_quantity} {ing.unit}
                      </td>
                      <td className="py-3.5 px-4">
                        {isLow ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-extrabold text-[10px] uppercase tracking-wider border border-amber-300">
                            ⚠️ Stock Bajo
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-extrabold text-[10px] uppercase tracking-wider border border-emerald-300">
                            ✓ Suficiente
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => quickAdjustStock(ing, -1)}
                            className="p-1 rounded-lg bg-[#FEE4D7] dark:bg-[#2E180E] text-[#9F6839] hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                            title="Restar 1 unidad"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => quickAdjustStock(ing, 1)}
                            className="p-1 rounded-lg bg-[#FEE4D7] dark:bg-[#2E180E] text-[#9F6839] hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer"
                            title="Sumar 1 unidad"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => openEditModal(ing)}
                          className="p-2 rounded-xl text-[#9F6839] hover:bg-[#FEE4D7] dark:hover:bg-[#2E180E] transition-colors cursor-pointer"
                          title="Editar insumo"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {filteredIngredients.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-[#9F6839] font-medium">
                      No hay insumos registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pestaña 2: Tabla de Mermas / Pérdidas */}
      {activeTab === 'waste' && (
        <div className="bg-white dark:bg-[#201009] border border-[#D4B28E] dark:border-[#9F6839]/40 rounded-3xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-xs">
              <thead className="bg-[#FEE4D7]/50 dark:bg-[#2A150C] text-[#9F6839] dark:text-[#DABA8C] uppercase tracking-wider text-[10px] border-b border-[#D4B28E]/60 font-bold">
                <tr>
                  <th className="py-3.5 px-4">Fecha / Hora</th>
                  <th className="py-3.5 px-4">Insumo Afectado</th>
                  <th className="py-3.5 px-4">Cantidad Perdida</th>
                  <th className="py-3.5 px-4">Costo / u ($)</th>
                  <th className="py-3.5 px-4 text-right">Pérdida Financiera Estimada</th>
                  <th className="py-3.5 px-4">Motivo / Razón</th>
                  <th className="py-3.5 px-4">Reportado Por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D4B28E]/30 text-[#432414] dark:text-[#FEE4D7]">
                {wasteReports.map((w) => (
                  <tr key={w.id}>
                    <td className="py-3.5 px-4 font-semibold">
                      {w.created_at ? new Date(w.created_at).toLocaleString() : '—'}
                    </td>
                    <td className="py-3.5 px-4 font-bold">{w.ingredient_name || 'Insumo'}</td>
                    <td className="py-3.5 px-4 font-extrabold text-amber-600">
                      -{w.quantity_lost} {w.unit}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#9F6839]">
                      ${(w.unit_cost || 0).toLocaleString()} /{w.unit}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-red-600 text-sm">
                      -${(w.estimated_loss || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 italic text-[#9F6839] dark:text-[#DABA8C]">{w.reason}</td>
                    <td className="py-3.5 px-4 font-bold">{w.reporter_name || 'Personal'}</td>
                  </tr>
                ))}
                {wasteReports.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-[#9F6839] font-medium">
                      No hay mermas reportadas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Reportar Daño / Merma (Acceso General para TODOS) */}
      <Modal isOpen={isWasteModalOpen} onClose={() => setIsWasteModalOpen(false)} title="Reportar Daño o Pérdida de Insumo">
        <form onSubmit={handleSubmitWaste} className="space-y-4">
          {formError && (
            <div className="p-3.5 rounded-2xl bg-red-50 text-red-700 border border-red-200 text-xs font-bold">
              ⚠️ {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#432414] dark:text-[#DABA8C] uppercase tracking-wider mb-1">
              Insumo Afectado
            </label>
            <select
              value={wasteIngredientId}
              onChange={(e) => {
                const id = e.target.value
                setWasteIngredientId(id)
                const ing = ingredients.find((i) => i.id === id)
                if (ing) {
                  setWasteUnit(ing.unit === 'L' ? 'ml' : ing.unit)
                }
              }}
              required
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#150904] border border-[#D4B28E] text-sm font-semibold text-[#432414] dark:text-[#FEE4D7]"
            >
              {ingredients.map((ing) => (
                <option key={ing.id} value={ing.id}>
                  {ing.name} (Stock Base: {ing.quantity} {ing.unit} | Costo/u: ${ing.unit_cost || 0})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-[#432414] dark:text-[#DABA8C] uppercase tracking-wider mb-1">
                Cantidad Perdida / Dañada
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={wasteQuantity}
                onChange={(e) => setWasteQuantity(e.target.value)}
                placeholder="Ej. 300, 0.5..."
                required
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#150904] border border-[#D4B28E] text-sm font-semibold text-[#432414] dark:text-[#FEE4D7]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#432414] dark:text-[#DABA8C] uppercase tracking-wider mb-1">
                Unidad
              </label>
              <select
                value={wasteUnit}
                onChange={(e) => setWasteUnit(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl bg-white dark:bg-[#150904] border border-[#D4B28E] text-xs font-bold text-[#432414] dark:text-[#FEE4D7]"
              >
                {AVAILABLE_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Badge de Conversión Automática de Unidades */}
          {selectedWasteIng && formatConvertedHint(wasteQuantity, wasteUnit, selectedWasteIng.unit) && (
            <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-xs text-amber-800 dark:text-amber-300 font-bold flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-amber-600" />
              <span>
                Conversión automática: <strong>{formatConvertedHint(wasteQuantity, wasteUnit, selectedWasteIng.unit)}</strong> (se descontará del stock base en {selectedWasteIng.unit}).
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#432414] dark:text-[#DABA8C] uppercase tracking-wider mb-1">
              Motivo / Razón del Daño
            </label>
            <input
              type="text"
              value={wasteReason}
              onChange={(e) => setWasteReason(e.target.value)}
              placeholder="Ej. Vasos quebrados por caída / Leche vencida / Derrame"
              required
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#150904] border border-[#D4B28E] text-sm font-semibold text-[#432414] dark:text-[#FEE4D7]"
            />
          </div>

          {estimatedWasteLoss > 0 && (
            <div className="p-3 rounded-2xl bg-red-50/80 dark:bg-red-950/40 border border-red-200 text-xs text-red-700 dark:text-red-300 font-extrabold flex justify-between items-center">
              <span>Pérdida Financiera Estimada:</span>
              <span className="text-sm text-red-600">${estimatedWasteLoss.toLocaleString()}</span>
            </div>
          )}

          <div className="p-3 rounded-2xl bg-[#FEE4D7]/50 dark:bg-[#2E180E] border border-[#D4B28E] text-xs text-[#9F6839] dark:text-[#DABA8C] font-semibold">
            ℹ️ Al confirmar, se descontará automáticamente la cantidad equivalente del inventario y se cargará el costo estimado a Contabilidad.
          </div>

          <div className="flex gap-3 justify-end pt-3">
            <button
              type="button"
              onClick={() => setIsWasteModalOpen(false)}
              className="px-4 py-2.5 rounded-2xl bg-white dark:bg-[#201009] border border-[#D4B28E] text-xs font-bold text-[#432414] dark:text-[#FEE4D7] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold shadow-md cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Registrando...' : 'Registrar Pérdida & Descontar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Crear / Editar Insumo */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingIngredient ? `Editar Insumo: ${editingIngredient.name}` : 'Nuevo Insumo'}
      >
        <form onSubmit={handleSubmitIngredient} className="space-y-4">
          {formError && (
            <div className="p-3.5 rounded-2xl bg-red-50 text-red-700 border border-red-200 text-xs font-bold">
              ⚠️ {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#432414] dark:text-[#DABA8C] uppercase tracking-wider mb-1">
              Nombre del Insumo
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Leche Entera / Café en Grano / Vasos 12oz"
              required
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#150904] border border-[#D4B28E] text-sm font-semibold text-[#432414] dark:text-[#FEE4D7]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#432414] dark:text-[#DABA8C] uppercase tracking-wider mb-1">
                Cantidad Actual
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0.00"
                required
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#150904] border border-[#D4B28E] text-sm font-semibold text-[#432414] dark:text-[#FEE4D7]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#432414] dark:text-[#DABA8C] uppercase tracking-wider mb-1">
                Unidad Base de Medida
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#150904] border border-[#D4B28E] text-sm font-semibold text-[#432414] dark:text-[#FEE4D7]"
              >
                {AVAILABLE_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#432414] dark:text-[#DABA8C] uppercase tracking-wider mb-1">
                Costo / Valor por Unidad ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                placeholder="Ej. 4000"
                required
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#150904] border border-[#D4B28E] text-sm font-semibold text-[#432414] dark:text-[#FEE4D7]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#432414] dark:text-[#DABA8C] uppercase tracking-wider mb-1">
                Stock Mínimo para Alerta
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={minQuantity}
                onChange={(e) => setMinQuantity(e.target.value)}
                placeholder="5.0"
                required
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#150904] border border-[#D4B28E] text-sm font-semibold text-[#432414] dark:text-[#FEE4D7]"
              />
            </div>
          </div>

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
              {submitting ? 'Guardando...' : editingIngredient ? 'Actualizar Insumo' : 'Crear Insumo'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}