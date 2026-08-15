import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'

export default function Recipe() {
    const { id } = useParams()
    const navigate = useNavigate()

    const [product, setProduct] = useState(null)
    const [ingredients, setIngredients] = useState([])
    const [lines, setLines] = useState([]) // [{ ingredient_id, quantity_used }]
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
            setLines(
                (recipeData || []).map((r) => ({
                    ingredient_id: r.ingredient_id,
                    quantity_used: r.quantity_used
                }))
            )
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
        setLines((prev) => [...prev, { ingredient_id: '', quantity_used: '' }])
    }

    function updateLine(index, field, value) {
        setLines((prev) => {
            const next = [...prev]
            next[index] = { ...next[index], [field]: value }
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
            .filter((l) => l.ingredient_id && l.quantity_used)
            .map((l) => ({
                ingredient_id: l.ingredient_id,
                quantity_used: Number(l.quantity_used)
            }))

        try {
            await api.put(`/products/${id}/recipe`, { items })
            navigate('/')
        } catch (err) {
            setError('No se pudo guardar la receta')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <p>Cargando receta...</p>

    return (
        <div style={{ maxWidth: 480 }}>
            <h2>Receta de {product?.name}</h2>
            {error && <p style={{ color: 'red' }}>{error}</p>}

            {lines.map((line, index) => (
                <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                    <select
                        value={line.ingredient_id}
                        onChange={(e) => updateLine(index, 'ingredient_id', e.target.value)}
                        style={{ flex: 1, padding: '0.4rem' }}
                    >
                        <option value="">Selecciona un insumo</option>
                        {ingredients.map((i) => (
                            <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                        ))}
                    </select>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Cantidad"
                        value={line.quantity_used}
                        onChange={(e) => updateLine(index, 'quantity_used', e.target.value)}
                        style={{ width: 100, padding: '0.4rem' }}
                    />
                    <button type="button" onClick={() => removeLine(index)}>✕</button>
                </div>
            ))}

            <button type="button" onClick={addLine} style={{ marginBottom: '1.5rem' }}>
                + Agregar insumo
            </button>

            <div>
                <button onClick={handleSave} disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar receta'}
                </button>
                <button type="button" onClick={() => navigate('/')} style={{ marginLeft: '0.5rem' }}>
                    Cancelar
                </button>
            </div>
        </div>
    )
}