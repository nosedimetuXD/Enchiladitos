import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import Modal from '../components/Modal'

export default function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')

  // Modal Nuevo Producto
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState('')

  const { user } = useAuth()
  const isOwner = user?.role === 'owner' || user?.role === 'admin'

  async function loadProducts() {
    try {
      const data = await api.get('/products')
      setProducts(data || [])
    } catch (err) {
      setPageError('No se pudieron cargar los productos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  function openCreateModal() {
    setName('')
    setDescription('')
    setPrice('')
    setFormError('')
    setIsModalOpen(true)
  }

  async function handleCreate(e) {
    e.preventDefault()
    setCreating(true)
    setFormError('')

    try {
      await api.post('/products', {
        name,
        description,
        price: Number(price)
      })
      setIsModalOpen(false)
      await loadProducts()
    } catch (err) {
      setFormError(err.message || 'No se pudo crear el producto')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este producto?')) return

    try {
      await api.delete(`/products/${id}`)
      await loadProducts()
    } catch (err) {
      setPageError('No se pudo eliminar el producto')
    }
  }

  if (loading) return <p>Cargando productos...</p>

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Catálogo de Productos</h2>
          <p className="page-subtitle">Gestión de productos y recetas de la cafetería</p>
        </div>
        {isOwner && (
          <button onClick={openCreateModal}>
            + Nuevo Producto
          </button>
        )}
      </div>

      {pageError && <p className="error-text" style={{ marginBottom: '1rem' }}>{pageError}</p>}

      {/* Tabla de Productos */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Precio</th>
              <th>Disponible</th>
              {isOwner && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.name}</td>
                <td>{p.description || '—'}</td>
                <td style={{ fontWeight: 800, color: 'var(--primary)' }}>${p.price.toLocaleString()}</td>
                <td>
                  {p.active ? (
                    <span className="badge-status status-listo">✔ Sí</span>
                  ) : (
                    <span className="badge-status status-cancelado">No</span>
                  )}
                </td>
                {isOwner && (
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Link to={`/products/${p.id}/recipe`}>
                        <button className="secondary" style={{ padding: '0.35rem 0.65rem', fontSize: '0.82rem' }}>
                          📜 Receta
                        </button>
                      </Link>
                      <button className="danger" onClick={() => handleDelete(p.id)} style={{ padding: '0.35rem 0.65rem', fontSize: '0.82rem' }}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={isOwner ? 5 : 4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  No hay productos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Nuevo Producto */}
      {isOwner && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nuevo Producto">
          <form onSubmit={handleCreate}>
            {formError && (
              <div style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1.25rem', fontWeight: 500 }}>
                ⚠️ {formError}
              </div>
            )}

            <div className="form-group">
              <label>Nombre del Producto</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Capuchino 12oz"
                required
              />
            </div>

            <div className="form-group">
              <label>Descripción</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej. Espresso doble con leche vaporizada y canela"
              />
            </div>

            <div className="form-group">
              <label>Precio ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button type="button" className="secondary" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </button>
              <button type="submit" disabled={creating}>
                {creating ? 'Creando...' : 'Guardar Producto'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}