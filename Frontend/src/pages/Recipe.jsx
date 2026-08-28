import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { BookOpen, Plus, Trash2, ArrowLeft, Lock, AlertTriangle, Flame } from 'lucide-react'

export default function Recipe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const userRole = (user?.role || '').toLowerCase()
  const isEmployee = userRole === 'empleado' || userRole === 'employee' || !['owner', 'admin'].includes(userRole)

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
      setError('No se pudo cargar la receta del producto')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  function addLine() {
    if (isEmployee) return
    setLines([...lines, { ingredient_id: '', user_quantity: 10, user_unit: 'g', quantity_used: 10 }])
  }

  function updateLine(index, field, value) {
    if (isEmployee) return
    const newLines = [...lines]
    newLines[index][field] = value

    if (field === 'ingredient_id') {
      const selectedIng = ingredients.find((i) => i.id === value)
      const unitLower = (selectedIng?.unit || '').toLowerCase()
      if (unitLower.includes('litro') || unitLower === 'l') {
        newLines[index].user_unit = 'ml'
      } else if (unitLower.includes('kg') || unitLower.includes('gramo')) {
        newLines[index].user_unit = 'g'
      } else {
        newLines[index].user_unit = selectedIng?.unit || 'unidades'
      }
    }

    const currentIng = ingredients.find((i) => i.id === newLines[index].ingredient_id)
    if (currentIng) {
      const ingUnitLower = (currentIng.unit || '').toLowerCase()
      const userQty = Number(newLines[index].user_quantity) || 0
      const uUnit = newLines[index].user_unit

      if (uUnit === 'ml' && (ingUnitLower === 'l' || ingUnitLower.includes('litro'))) {
        newLines[index].quantity_used = userQty / 1000
      } else if (uUnit === 'l' && (ingUnitLower === 'l' || ingUnitLower.includes('litro'))) {
        newLines[index].quantity_used = userQty
      } else if (uUnit === 'g' && (ingUnitLower === 'kg' || ingUnitLower.includes('kilo'))) {
        newLines[index].quantity_used = userQty / 1000
      } else if (uUnit === 'kg' && (ingUnitLower === 'kg' || ingUnitLower.includes('kilo'))) {
        newLines[index].quantity_used = userQty
      } else {
        newLines[index].quantity_used = userQty
      }
    }

    setLines(newLines)
  }

  function removeLine(index) {
    if (isEmployee) return
    setLines(lines.filter((_, i) => i !== index))
  }

  async function handleSave() {
    if (isEmployee) return
    setSaving(true)
    setError('')

    try {
      const items = lines
        .filter((l) => l.ingredient_id && Number(l.quantity_used) > 0)
        .map((l) => ({
          ingredient_id: l.ingredient_id,
          quantity_used: Number(l.quantity_used)
        }))

      await api.put(`/products/${id}/recipe`, { items })
      navigate('/products')
    } catch (err) {
      setError(err.message || 'Error al guardar la receta')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="p-4 text-sm font-semibold text-red-600">Cargando receta...</p>

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-red-200/60 dark:border-red-950">
        <button
          onClick={() => navigate('/products')}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-[#1c0707] border border-red-200 text-xs font-black text-red-600 hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a Productos
        </button>
        <div className="flex items-center gap-2">
          {isEmployee && (
            <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-extrabold text-[11px] flex items-center gap-1 border border-amber-300">
              <Lock className="w-3 h-3" /> Solo Lectura
            </span>
          )}
          <span className="px-3 py-1 rounded-full bg-red-50 dark:bg-[#2e0e0e] text-red-600 dark:text-amber-300 font-black text-xs border border-red-200">
            {product?.category || 'Producto'}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-red-50 text-red-700 border border-red-200 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white dark:bg-[#1c0707] border border-red-200 dark:border-red-950/60 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-[#240a0a] flex items-center justify-center text-red-600">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#450a0a] dark:text-[#fef2f2]">{product?.name}</h2>
            <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
              {isEmployee ? 'Ficha técnica y receta de insumos' : 'Insumos que se descuentan automáticamente del inventario al vender este producto'}
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {lines.map((line, index) => {
            const foundIng = ingredients.find((i) => i.id === line.ingredient_id)
            const unitLower = (foundIng?.unit || '').toLowerCase()
            const isLiquid = unitLower.includes('l') || unitLower.includes('litro') || unitLower.includes('ml')
            const isWeight = unitLower.includes('g') || unitLower.includes('kg') || unitLower.includes('gramo') || unitLower.includes('kilo') || unitLower.includes('mg')

            return (
              <div key={index} className="p-3.5 rounded-2xl bg-red-50/40 dark:bg-[#240a0a] border border-red-200/60 dark:border-red-950 space-y-2">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <label className="block text-[10px] font-black text-red-600 uppercase tracking-wider mb-1">
                      Insumo Requerido
                    </label>
                    <select
                      disabled={isEmployee}
                      value={line.ingredient_id}
                      onChange={(e) => updateLine(index, 'ingredient_id', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#140505] border border-red-200 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] disabled:opacity-80"
                    >
                      <option value="">Seleccionar insumo...</option>
                      {ingredients.map((ing) => (
                        <option key={ing.id} value={ing.id}>
                          {ing.name} (Stock: {ing.quantity} {ing.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-end gap-2">
                    <div>
                      <label className="block text-[10px] font-black text-red-600 uppercase tracking-wider mb-1">
                        Cantidad Usada
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        disabled={isEmployee}
                        value={line.user_quantity}
                        onChange={(e) => updateLine(index, 'user_quantity', e.target.value)}
                        className="w-28 px-3 py-2 rounded-xl bg-white dark:bg-[#140505] border border-red-200 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] disabled:opacity-80"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-red-600 uppercase tracking-wider mb-1">
                        Unidad
                      </label>
                      <select
                        disabled={isEmployee}
                        value={line.user_unit}
                        onChange={(e) => updateLine(index, 'user_unit', e.target.value)}
                        className="w-32 px-3 py-2 rounded-xl bg-white dark:bg-[#140505] border border-red-200 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] disabled:opacity-80"
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
                            <option value="mg">mg (Miligramos)</option>
                          </>
                        ) : (
                          <option value={foundIng?.unit || 'unidades'}>{foundIng?.unit || 'unidades'}</option>
                        )}
                      </select>
                    </div>

                    {!isEmployee && (
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                        title="Quitar ingrediente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {lines.length === 0 && (
            <p className="text-xs text-red-400 text-center py-6 font-bold">
              Este producto aún no tiene ingredientes asignados a su receta.
            </p>
          )}
        </div>

        {!isEmployee && (
          <button
            type="button"
            onClick={addLine}
            className="w-full py-2.5 rounded-2xl bg-red-50 dark:bg-[#240a0a] border border-red-200 text-red-600 dark:text-amber-300 font-black text-xs inline-flex items-center justify-center gap-2 cursor-pointer hover:bg-red-600 hover:text-white transition-colors"
          >
            <Plus className="w-4 h-4" /> Agregar Insumo a la Receta
          </button>
        )}

        <div className="flex gap-3 justify-end pt-4 border-t border-red-200/60 dark:border-red-950">
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="px-4 py-2.5 rounded-2xl bg-white dark:bg-[#1c0707] border border-red-200 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] cursor-pointer"
          >
            Volver a Productos
          </button>
          {!isEmployee && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white text-xs font-black shadow-md cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar Receta'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}