import { useEffect, useState, useCallback } from 'react'
import { useEvents } from '../hooks/useEvents'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'

export default function Inventory() {
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')

  const { user } = useAuth()
  const canManage = user?.role === 'owner' || user?.role === 'admin'

  // Modal Nuevo/Editar Insumo
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingIngredient, setEditingIngredient] = useState(null)
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('')
  const [quantity, setQuantity] = useState('')
  const [minThreshold, setMinThreshold] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  async function loadIngredients() {
    try {
      const data = await api.get('/ingredients')
      setIngredients(data || [])
    } catch (err) {
      setPageError('No se pudieron cargar los insumos de inventario')
    } finally {
      setLoading(false)
    }
  }

  const handleInventoryEvent = useCallback(() => {
    loadIngredients()
  }, [])

  useEvents(['inventory_updated', 'inventory_deleted'], handleInventoryEvent)

  useEffect(() => {
    loadIngredients()
  }, [])

  function openCreateModal() {
    setEditingIngredient(null)
    setName('')
    setUnit('')
    setQuantity('')
    setMinThreshold('')
    setFormError('')
    setIsModalOpen(true)
  }

  function openEditModal(ing) {
    setEditingIngredient(ing)
    setName(ing.name)
    setUnit(ing.unit)
    setQuantity(ing.quantity.toString())
    setMinThreshold(ing.min_threshold != null ? ing.min_threshold.toString() : '')
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
          unit,
          quantity: Number(quantity),
          min_threshold: minThreshold ? Number(minThreshold) : null
        })
      } else {
        await api.post('/ingredients', {
          name,
          unit,
          quantity: Number(quantity),
          min_threshold: minThreshold ? Number(minThreshold) : null
        })
      }

      setIsModalOpen(false)
      await loadIngredients()
    } catch (err) {
      setFormError(err.message || (editingIngredient ? 'No se pudo actualizar el insumo' : 'No se pudo crear el insumo'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este insumo del inventario?')) return

    try {
      await api.delete(`/ingredients/${id}`)
      await loadIngredients()
    } catch (err) {
      setPageError('No se pudo eliminar el insumo')
    }
  }

  if (loading) return <p>Cargando inventario...</p>

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Inventario de Insumos</h2>
          <p className="page-subtitle">Control de stock de materias primas e ingredientes</p>
        </div>
        {canManage && (
          <button onClick={openCreateModal}>
            + Añadir Insumo
          </button>
        )}
      </div>

      {pageError && <p className="error-text" style={{ marginBottom: '1rem' }}>{pageError}</p>}

      {/* Tabla de Inventario */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Insumo</th>
              <th>Unidad</th>
              <th>Cantidad Actual</th>
              <th>Alerta Stock Mínimo</th>
              <th>Estado Stock</th>
              {canManage && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {ingredients.map((i) => {
              const isLow = i.min_threshold != null && i.quantity <= i.min_threshold
              return (
                <tr key={i.id} className={isLow ? 'row-warning' : ''}>
                  <td style={{ fontWeight: 600 }}>{i.name}</td>
                  <td>{i.unit}</td>
                  <td style={{ fontWeight: 700, fontSize: '1rem' }}>
                    {i.quantity} {i.unit}
                  </td>
                  <td>{i.min_threshold != null ? `${i.min_threshold} ${i.unit}` : '—'}</td>
                  <td>
                    {isLow ? (
                      <span className="badge-status status-cancelado">⚠️ Stock Bajo</span>
                    ) : (
                      <span className="badge-status status-listo">✔ Normal</span>
                    )}
                  </td>
                  {canManage && (
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="secondary" onClick={() => openEditModal(i)} style={{ padding: '0.35rem 0.65rem', fontSize: '0.82rem' }}>
                          ✏️ Editar
                        </button>
                        <button className="danger" onClick={() => handleDelete(i.id)} style={{ padding: '0.35rem 0.65rem', fontSize: '0.82rem' }}>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
            {ingredients.length === 0 && (
              <tr>
                <td colSpan={canManage ? 6 : 5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  No hay insumos registrados en el inventario.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Crear/Editar Insumo */}
      {canManage && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingIngredient ? 'Editar Insumo' : 'Nuevo Insumo'}
        >
          <form onSubmit={handleSubmit}>
            {formError && (
              <div style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1.25rem', fontWeight: 500 }}>
                ⚠️ {formError}
              </div>
            )}

            <div className="form-group">
              <label>Nombre del Insumo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Café en Grano / Leche Entera"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Unidad de Medida</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="Ej. kg, litros, unidades..."
                  required
                />
              </div>
              <div className="form-group">
                <label>Cantidad Inicial</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Alerta de Stock Mínimo (Opcional)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={minThreshold}
                onChange={(e) => setMinThreshold(e.target.value)}
                placeholder="Ej. 2.0"
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button type="button" className="secondary" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </button>
              <button type="submit" disabled={submitting}>
                {submitting ? 'Guardando...' : editingIngredient ? 'Actualizar Insumo' : 'Crear Insumo'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}