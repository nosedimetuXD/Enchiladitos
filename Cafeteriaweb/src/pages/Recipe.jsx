import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { BookOpen, Plus, Trash2, ArrowLeft, Scale } from 'lucide-react'

export default function Recipe() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [product, setProduct] = useState(null)
  const [ingredients, setIngredients] = useState([])
  const [lines, setLines] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function loadData() {
    try {
      const [productData, ingredientsData, recipeData] = await Promise.all([
        api.get(`/products/${id}`),
        api.get('/ingredients'),
        api.get(`/products/${id}/recipe`)
      ])
      setProduct(productData)
      setIngredients(ingredientsData || [])
      
      const loadedLines = (recipeData || []).map((r) => {
        const foundIng = (ingredientsData || []).find((i) => i.id === r.ingredient_id)
        const unitLower = foundIng?.unit?.toLowerCase() || ''
        
        let initialUserUnit = 'custom'
        let initialUserQty = r.quantity_used

        if (unitLower.includes('litro') || unitLower === 'l') {
          initialUserUnit = 'ml'
          initialUserQty = r.quantity_used * 1000
        } else if (unitLower.includes('kg') || unitLower.includes('kilo') || unitLower.includes('gramo')) {
          initialUserUnit = 'g'
          initialUserQty = r.quantity_used * 1000
        }

        return {
          ingredient_id: r.ingredient_id,
          user_quantity: initialUserQty,
          user_unit: initialUserUnit,
          quantity_used: r.quantity_used
        }
      })

      setLines(loadedLines)
    } catch (err) {
      setError('No se pudo cargar la receta')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  function addLine() {
    setLines((prev) => [...prev, { ingredient_id: '', user_quantity: '', user_unit: 'default', quantity_used: '' }])
  }

  function updateLine(index, field, value) {
    setLines((prev) => {
      const next = [...prev]
      const current = { ...next[index], [field]: value }

      const foundIng = ingredients.find((i) => i.id === current.ingredient_id)
      const ingUnit = foundIng?.unit?.toLowerCase() || ''

      // Auto ajustar unidad seleccionada al cambiar de insumo
      if (field === 'ingredient_id') {
        if (ingUnit.includes('litro') || ingUnit === 'l') {
          current.user_unit = 'ml'
        } else if (ingUnit.includes('kg') || ingUnit.includes('kilo') || ingUnit.includes('gramo')) {
          current.user_unit = 'g'
        } else {
          current.user_unit = 'default'
        }
      }

      // Calcular la cantidad real que se guardará en BD (l / kg)
      const numUserQty = Number(current.user_quantity) || 0
      if (current.user_unit === 'ml' || current.user_unit === 'g') {
        current.quantity_used = numUserQty / 1000
      } else {
        current.quantity_used = numUserQty
      }

      next[index] = current
      return next
    })
  }

  function removeLine(index) {
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    setSaving(true)
    setError('')

    const items = lines
      .filter((l) => l.ingredient_id && Number(l.quantity_used) > 0)
      .map((l) => ({
        ingredient_id: l.ingredient_id,
        quantity_used: Number(l.quantity_used)
      }))

    try {
      await api.put(`/products/${id}/recipe`, { items })
      navigate('/products')
    } catch (err) {
      setError('No se pudo guardar la receta')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="p-4 text-sm font-semibold text-[#9F6839]">Cargando receta del producto...</p>

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/products')}
          className="p-2 rounded-xl bg-white dark:bg-[#201009] border border-[#D4B28E] text-[#9F6839] hover:bg-[#FEE4D7] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-extrabold text-[#432414] dark:text-[#FEE4D7] tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#9F6839]" /> Receta: {product?.name}
          </h2>
          <p className="text-xs font-semibold text-[#9F6839] dark:text-[#DABA8C] mt-0.5">
            Configuración de insumos con conversión automática (ml ➔ Litros / g ➔ Kg)
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-red-50 text-red-700 border border-red-200 text-xs font-bold">
          ⚠️ {error}
        </div>
      )}

      <div className="bg-white dark:bg-[#201009] border border-[#D4B28E] dark:border-[#9F6839]/40 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="space-y-3">
          {lines.map((line, index) => {
            const foundIng = ingredients.find((i) => i.id === line.ingredient_id)
            const ingUnit = foundIng?.unit?.toLowerCase() || ''
            const isLiquid = ingUnit.includes('litro') || ingUnit === 'l'
            const isWeight = ingUnit.includes('kg') || ingUnit.includes('kilo') || ingUnit.includes('gramo')

            return (
              <div key={index} className="bg-[#FEE4D7]/30 dark:bg-[#2E180E] border border-[#D4B28E]/60 p-4 rounded-2xl space-y-2">
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <select
                    value={line.ingredient_id}
                    onChange={(e) => updateLine(index, 'ingredient_id', e.target.value)}
                    className="flex-1 w-full px-3 py-2 rounded-xl bg-white dark:bg-[#150904] border border-[#D4B28E] text-xs font-semibold text-[#432414] dark:text-[#FEE4D7]"
                  >
                    <option value="">Selecciona un insumo de inventario...</option>
                    {ingredients.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} ({i.unit})
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Cantidad"
                      value={line.user_quantity}
                      onChange={(e) => updateLine(index, 'user_quantity', e.target.value)}
                      className="w-28 px-3 py-2 rounded-xl bg-white dark:bg-[#150904] border border-[#D4B28E] text-xs font-bold text-[#432414] dark:text-[#FEE4D7]"
                    />

                    <select
                      value={line.user_unit}
                      onChange={(e) => updateLine(index, 'user_unit', e.target.value)}
                      className="w-32 px-3 py-2 rounded-xl bg-white dark:bg-[#150904] border border-[#D4B28E] text-xs font-bold text-[#432414] dark:text-[#FEE4D7]"
                    >
                      {isLiquid ? (
                        <>
                          <option value="ml">ml (Mililitros)</option>
                          <option value="l">L (Litros)</option>
                        </>
                      ) : isWeight ? (
                        <>
                          <option value="g">g (Gramos)</option>
                          <option value="kg">kg (Kilos)</option>
                        </>
                      ) : (
                        <option value="default">{foundIng?.unit || 'unidades'}</option>
                      )}
                    </select>

                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                      title="Quitar ingrediente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Badge de Conversión en Tiempo Real */}
                {line.ingredient_id && Number(line.user_quantity) > 0 && (
                  <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#9F6839] dark:text-[#DABA8C] pt-1">
                    <Scale className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      Conversión a inventario: {line.user_quantity} {line.user_unit} ➔{' '}
                      <strong className="text-emerald-600">{Number(line.quantity_used).toFixed(4)} {foundIng?.unit || ''}</strong>
                    </span>
                  </div>
                )}
              </div>
            )
          })}

          {lines.length === 0 && (
            <p className="text-xs text-[#9F6839] text-center py-6 font-semibold">
              Este producto aún no tiene ingredientes asignados a su receta.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={addLine}
          className="w-full py-2.5 rounded-2xl bg-[#FEE4D7] dark:bg-[#2E180E] border border-[#D4B28E] text-[#9F6839] dark:text-[#DABA8C] font-extrabold text-xs inline-flex items-center justify-center gap-2 cursor-pointer hover:bg-[#9F6839] hover:text-white transition-colors"
        >
          <Plus className="w-4 h-4" /> Agregar Insumo a la Receta
        </button>

        <div className="flex gap-3 justify-end pt-4 border-t border-[#D4B28E]/40">
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="px-4 py-2.5 rounded-2xl bg-white dark:bg-[#201009] border border-[#D4B28E] text-xs font-bold text-[#432414] dark:text-[#FEE4D7] cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-2xl bg-[#9F6839] hover:bg-[#835229] text-white text-xs font-extrabold shadow-md cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar Receta'}
          </button>
        </div>
      </div>
    </div>
  )
}