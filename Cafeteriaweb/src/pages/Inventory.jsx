import { useEffect, useState } from 'react'
import { api } from '../api/client'
import Modal from '../components/Modal'
import { Package, Plus, Minus, AlertTriangle, Search, Edit2 } from 'lucide-react'

export default function Inventory() {
  const [ingredients, setIngredients] = useState([])
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
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  async function loadIngredients() {
    try {
      const data = await api.get('/ingredients')
      setIngredients(data || [])
    } catch (err) {
      setPageError('No se pudieron cargar los insumos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadIngredients()
  }, [])

  function openCreateModal() {
    setEditingIngredient(null)
    setName('')
    setQuantity('')
    setUnit('unidades')
    setMinQuantity('5')
    setFormError('')
    setIsModalOpen(true)
  }

  function openEditModal(ing) {
    setEditingIngredient(ing)
    setName(ing.name)
    setQuantity(String(ing.quantity))
    setUnit(ing.unit)
    setMinQuantity(String(ing.min_quantity))
    setFormError('')
    setIsModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')

    try {
      if (editingIngredient) {
        await api.put(`/ingredients/${editingIngredient.id}`, {
          name,
          quantity: Number(quantity),
          unit,
          min_quantity: Number(minQuantity)
        })
      } else {
        await api.post('/ingredients', {
          name,
          quantity: Number(quantity),
          unit,
          min_quantity: Number(minQuantity)
        })
      }

      setIsModalOpen(false)
      await loadIngredients()
    } catch (err) {
      setFormError(err.message || 'No se pudo guardar el insumo')
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
        min_quantity: ing.min_quantity
      })
      await loadIngredients()
    } catch (err) {
      alert('No se pudo ajustar el stock')
    }
  }

  const lowStockCount = ingredients.filter((i) => i.quantity <= i.min_quantity).length
  const filtered = ingredients.filter((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()))

  if (loading) return <p className="p-4 text-sm font-semibold text-[#9F6839]">Cargando inventario...</p>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#432414] dark:text-[#FEE4D7] tracking-tight">
            Control de Inventario & Insumos
          </h2>
          <p className="text-xs font-semibold text-[#9F6839] dark:text-[#DABA8C] mt-0.5">
            Gestión de materias primas, leche, café en grano y desechables
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

      {/* Buscador */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9F6839]" />
        <input
          type="text"
          placeholder="Buscar insumo por nombre..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white dark:bg-[#201009] border border-[#D4B28E] dark:border-[#9F6839]/40 focus:border-[#9F6839] rounded-2xl pl-10 pr-3 py-2.5 text-xs font-semibold text-[#432414] dark:text-[#FEE4D7] focus:outline-none shadow-xs"
        />
      </div>

      {/* Tabla de Insumos */}
      <div className="bg-white dark:bg-[#201009] border border-[#D4B28E] dark:border-[#9F6839]/40 rounded-3xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FEE4D7]/50 dark:bg-[#2A150C] text-[#9F6839] dark:text-[#DABA8C] uppercase tracking-wider text-[10px] border-b border-[#D4B28E]/60 font-bold">
              <tr>
                <th className="py-3.5 px-4">Insumo / Materia Prima</th>
                <th className="py-3.5 px-4">Stock Actual</th>
                <th className="py-3.5 px-4">Mínimo Requerido</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4 text-center">Ajuste Rápido</th>
                <th className="py-3.5 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D4B28E]/30 text-[#432414] dark:text-[#FEE4D7]">
              {filtered.map((ing) => {
                const isLow = ing.quantity <= ing.min_quantity
                return (
                  <tr key={ing.id} className={isLow ? 'bg-red-50/40 dark:bg-red-950/20' : ''}>
                    <td className="py-3.5 px-4 font-bold text-sm">{ing.name}</td>
                    <td className="py-3.5 px-4 font-extrabold text-sm">
                      {ing.quantity} {ing.unit}
                    </td>
                    <td className="py-3.5 px-4 text-[#9F6839] dark:text-[#DABA8C]">
                      {ing.min_quantity} {ing.unit}
                    </td>
                    <td className="py-3.5 px-4">
                      {isLow ? (
                        <span className="px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 font-extrabold text-[10px]">
                          ⚠️ Stock Bajo
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold text-[10px]">
                          ✓ Normal
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
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-[#9F6839] font-medium">
                    No se encontraron insumos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear / Editar Insumo */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingIngredient ? `Editar Insumo: ${editingIngredient.name}` : 'Nuevo Insumo'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div>
            <label className="block text-xs font-bold text-[#432414] dark:text-[#DABA8C] uppercase tracking-wider mb-1">
              Cantidad Mínima para Alerta de Stock Bajo
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