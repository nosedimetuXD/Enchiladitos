import { useEffect, useState } from 'react'
import { api } from '../api/client'
import Modal from '../components/Modal'
import { Package, Plus, Minus, AlertTriangle, Search, Edit2, ShieldAlert, History, DollarSign } from 'lucide-react'

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
  const [unit, setUnit] = useState('unidades')
  const [minQuantity, setMinQuantity] = useState('5')
  const [unitCost, setUnitCost] = useState('0')

  // Modal Reportar Daño / Merma
  const [isWasteModalOpen, setIsWasteModalOpen] = useState(false)
  const [wasteIngredientId, setWasteIngredientId] = useState('')
  const [wasteQuantity, setWasteQuantity] = useState('')
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
    setUnit('unidades')
    setMinQuantity('5')
    setUnitCost('0')
    setFormError('')
    setIsModalOpen(true)
  }

  function openEditModal(ing) {
    setEditingIngredient(ing)
    setName(ing.name)
    setQuantity(String(ing.quantity))
    setUnit(ing.unit)
    setMinQuantity(String(ing.min_quantity ?? 5))
    setUnitCost(String(ing.unit_cost ?? 0))
    setFormError('')
    setIsModalOpen(true)
  }

  function openWasteModal() {
    setWasteIngredientId(ingredients.length > 0 ? ingredients[0].id : '')
    setWasteQuantity('')
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

  async function handleSubmitWaste(e) {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')

    if (!wasteIngredientId) {
      setFormError('Selecciona el insumo afectado')
      setSubmitting(false)
      return
    }

    const qty = Number(wasteQuantity)
    if (!qty || qty <= 0) {
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
      await api.post('/waste', {
        ingredient_id: wasteIngredientId,
        quantity_lost: qty,
        reason: wasteReason.trim()
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

  const selectedWasteIng = ingredients.find((i) => i.id === wasteIngredientId)
  const estimatedWasteLoss = selectedWasteIng && Number(wasteQuantity) > 0 ? Number(wasteQuantity) * (selectedWasteIng.unit_cost || 0) : 0

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
            Gestión de materias primas, insumos y registro de pérdidas o daños
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lowStockCount > 0 && (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 text-xs font-bold shadow-xs">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span>{lowStockCount} insumos en stock crítico</span>
            </div>
          )}

          <button
            onClick={openWasteModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4" /> Reportar Daño / Merma
          </button>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#9F6839] hover:bg-[#835229] text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Nuevo Insumo
          </button>
        </div>
      </div>

      {pageError && (
        <div className="p-3.5 rounded-2xl bg-red-50 text-red-700 border border-red-200 text-xs font-bold">
          ⚠️ {pageError}
        </div>
      )}

      {/* Pestañas (Inventario / Historial de Mermas) */}
      <div className="flex items-center justify-between border-b border-[#D4B28E]/40 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'inventory'
                ? 'bg-[#9F6839] text-white shadow-xs'
                : 'bg-white dark:bg-[#201009] border border-[#D4B28E] text-[#432414] dark:text-[#FEE4D7]'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Inventario de Insumos</span>
          </button>
          <button
            onClick={() => setActiveTab('waste')}
            className={`px-4 py-2 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'waste'
                ? 'bg-[#9F6839] text-white shadow-xs'
                : 'bg-white dark:bg-[#201009] border border-[#D4B28E] text-[#432414] dark:text-[#FEE4D7]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Historial de Daños & Pérdidas ({wasteReports.length})</span>
          </button>
        </div>

        {activeTab === 'inventory' && (
          <div className="relative max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9F6839]" />
            <input
              type="text"
              placeholder="Buscar insumo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-[#201009] border border-[#D4B28E] dark:border-[#9F6839]/40 focus:border-[#9F6839] rounded-2xl pl-10 pr-3 py-1.5 text-xs font-semibold text-[#432414] dark:text-[#FEE4D7] focus:outline-none shadow-xs"
            />
          </div>
        )}
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
                  <th className="py-3.5 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D4B28E]/30 text-[#432414] dark:text-[#FEE4D7]">
                {filteredIngredients.map((ing) => {
                  const isLow = ing.quantity <= ing.min_quantity
                  return (
                    <tr key={ing.id} className={isLow ? 'bg-red-50/40 dark:bg-red-950/20' : ''}>
                      <td className="py-3.5 px-4 font-bold text-sm">{ing.name}</td>
                      <td className="py-3.5 px-4 font-extrabold text-sm">
                        {ing.quantity} {ing.unit}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-600">
                        ${(Number(ing.unit_cost) || 0).toLocaleString()} / {ing.unit}
                      </td>
                      <td className="py-3.5 px-4 text-[#9F6839] dark:text-[#DABA8C]">
                        {ing.min_quantity} {ing.unit}
                      </td>
                      <td className="py-3.5 px-4">
                        {isLow ? (
                          <span className="px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 font-extrabold text-[10px] uppercase tracking-wider">
                            Stock Bajo
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold text-[10px] uppercase tracking-wider">
                            Normal
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1 bg-[#FEE4D7]/50 dark:bg-[#2E180E] border border-[#D4B28E] p-1 rounded-2xl">
                          <button
                            onClick={() => quickAdjustStock(ing, -1)}
                            className="p-1 rounded-xl bg-white dark:bg-[#150904] text-[#432414] dark:text-[#FEE4D7] border border-[#D4B28E] cursor-pointer"
                            title="-1 unidad"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => quickAdjustStock(ing, 1)}
                            className="p-1 rounded-xl bg-white dark:bg-[#150904] text-[#432414] dark:text-[#FEE4D7] border border-[#D4B28E] cursor-pointer"
                            title="+1 unidad"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => quickAdjustStock(ing, 5)}
                            className="px-2 py-1 rounded-xl bg-[#9F6839] text-white text-[10px] font-extrabold cursor-pointer"
                            title="+5 unidades"
                          >
                            +5
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
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
                      No se encontraron insumos registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pestaña 2: Historial de Daños & Mermas */}
      {activeTab === 'waste' && (
        <div className="bg-white dark:bg-[#201009] border border-[#D4B28E] dark:border-[#9F6839]/40 rounded-3xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-xs">
              <thead className="bg-[#FEE4D7]/50 dark:bg-[#2A150C] text-[#9F6839] dark:text-[#DABA8C] uppercase tracking-wider text-[10px] border-b border-[#D4B28E]/60 font-bold">
                <tr>
                  <th className="py-3.5 px-4">Fecha / Hora</th>
                  <th className="py-3.5 px-4">Insumo Afectado</th>
                  <th className="py-3.5 px-4">Cantidad Descontada</th>
                  <th className="py-3.5 px-4">Pérdida Financiera Est. ($)</th>
                  <th className="py-3.5 px-4">Motivo del Daño / Pérdida</th>
                  <th className="py-3.5 px-4">Reportado Por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D4B28E]/30 text-[#432414] dark:text-[#FEE4D7]">
                {wasteReports.map((w) => {
                  const lossAmt = Number(w.estimated_loss) || (Number(w.quantity_lost) * Number(w.unit_cost || 0))
                  return (
                    <tr key={w.id} className="hover:bg-red-50/20 dark:hover:bg-red-950/10">
                      <td className="py-3.5 px-4 font-semibold">{new Date(w.created_at).toLocaleString()}</td>
                      <td className="py-3.5 px-4 font-bold">{w.ingredient_name}</td>
                      <td className="py-3.5 px-4 font-extrabold text-red-600 text-sm">
                        -{w.quantity_lost} {w.unit}
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-red-600 text-sm">
                        -${lossAmt.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-[#432414] dark:text-[#FEE4D7]">
                        {w.reason}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#9F6839]">
                        {w.reporter_name || 'Personal'}
                      </td>
                    </tr>
                  )
                })}
                {wasteReports.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-[#9F6839] font-medium">
                      No hay registros de daños o mermas hasta el momento.
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
              onChange={(e) => setWasteIngredientId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#150904] border border-[#D4B28E] text-sm font-semibold text-[#432414] dark:text-[#FEE4D7]"
            >
              {ingredients.map((ing) => (
                <option key={ing.id} value={ing.id}>
                  {ing.name} (Stock: {ing.quantity} {ing.unit} | Costo/u: ${ing.unit_cost || 0})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#432414] dark:text-[#DABA8C] uppercase tracking-wider mb-1">
              Cantidad Perdida / Dañada {selectedWasteIng ? `(${selectedWasteIng.unit})` : ''}
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={wasteQuantity}
              onChange={(e) => setWasteQuantity(e.target.value)}
              placeholder="Ej. 2 vasos, 1.5 litros de leche, 500g grano..."
              required
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#150904] border border-[#D4B28E] text-sm font-semibold text-[#432414] dark:text-[#FEE4D7]"
            />
          </div>

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
            ℹ️ Al confirmar, se descontará esa cantidad del inventario y se cargará el costo estimado a Contabilidad.
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
              placeholder="Ej. Café en Grano Tostado 1kg / Leche Entera"
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
                Unidad de Medida
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="kg, litros, unidades..."
                required
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#150904] border border-[#D4B28E] text-sm font-semibold text-[#432414] dark:text-[#FEE4D7]"
              />
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