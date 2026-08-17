import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import Modal from '../components/Modal'
import { Coffee, Plus, Edit2, Trash2, Search, BookOpen, Image as ImageIcon } from 'lucide-react'

const DEFAULT_PRODUCT_IMAGE = 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80'

export default function Products() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')

  // Modal Crear / Editar Producto
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('Café')
  const [imageUrl, setImageUrl] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  async function loadProducts() {
    try {
      const data = await api.get('/products')
      setProducts(data || [])

      const cats = Array.from(new Set((data || []).map((p) => p.category))).filter(Boolean)
      setCategories(['Todos', ...cats])
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
    setEditingProduct(null)
    setName('')
    setDescription('')
    setPrice('')
    setCategory('Café')
    setImageUrl('')
    setIsActive(true)
    setFormError('')
    setIsModalOpen(true)
  }

  function openEditModal(prod) {
    setEditingProduct(prod)
    setName(prod.name)
    setDescription(prod.description || '')
    setPrice(String(prod.price))
    setCategory(prod.category || 'Café')
    setImageUrl(prod.image_url || '')
    const currentActive = typeof prod.active !== 'undefined' ? prod.active : (prod.is_active ?? true)
    setIsActive(currentActive)
    setFormError('')
    setIsModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')

    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        price: Number(price),
        category: category.trim() || 'Café',
        image_url: imageUrl.trim(),
        active: isActive,
        is_active: isActive
      }

      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, payload)
      } else {
        await api.post('/products', payload)
      }

      setIsModalOpen(false)
      await loadProducts()
    } catch (err) {
      setFormError(err.message || 'No se pudo guardar el producto')
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleProductActive(prod, e) {
    e.stopPropagation()
    const currentActive = typeof prod.active !== 'undefined' ? prod.active : (prod.is_active ?? true)
    try {
      await api.put(`/products/${prod.id}`, {
        name: prod.name,
        description: prod.description || '',
        price: prod.price,
        category: prod.category || 'Café',
        image_url: prod.image_url || '',
        active: !currentActive,
        is_active: !currentActive
      })
      await loadProducts()
    } catch (err) {
      alert('Error al cambiar el estado del producto')
    }
  }

  async function handleDelete(id, prodName) {
    if (!window.confirm(`¿Seguro que deseas eliminar el producto "${prodName}"?`)) return
    try {
      await api.delete(`/products/${id}`)
      await loadProducts()
    } catch (err) {
      alert('Error al eliminar producto')
    }
  }

  const filtered = products.filter((p) => {
    const matchCat = selectedCategory === 'Todos' || p.category === selectedCategory
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchCat && matchSearch
  })

  if (loading) return <p className="p-4 text-sm font-semibold text-[#9F6839]">Cargando productos...</p>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#432414] dark:text-[#FEE4D7] tracking-tight">
            Catálogo de Productos & Menú Toffee Coffee
          </h2>
          <p className="text-xs font-semibold text-[#9F6839] dark:text-[#DABA8C] mt-0.5">
            Configuración de precios, recetas, fotos e insumos sincronizados en todos los dispositivos
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#9F6839] hover:bg-[#835229] text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Nuevo Producto
        </button>
      </div>

      {pageError && (
        <div className="p-3.5 rounded-2xl bg-red-50 text-red-700 border border-red-200 text-xs font-bold">
          ⚠️ {pageError}
        </div>
      )}

      {/* Buscador & Categorías */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9F6839]" />
          <input
            type="text"
            placeholder="Buscar producto por nombre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-[#201009] border border-[#D4B28E] dark:border-[#9F6839]/40 focus:border-[#9F6839] rounded-2xl pl-10 pr-3 py-2.5 text-xs font-semibold text-[#432414] dark:text-[#FEE4D7] focus:outline-none shadow-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#9F6839] text-white shadow-xs'
                  : 'bg-white dark:bg-[#201009] border border-[#D4B28E] text-[#432414] dark:text-[#FEE4D7]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Productos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((prod) => {
          const activeState = typeof prod.active !== 'undefined' ? prod.active : (prod.is_active ?? true)
          const img = prod.image_url || DEFAULT_PRODUCT_IMAGE

          return (
            <div
              key={prod.id}
              className={`bg-white dark:bg-[#201009] border border-[#D4B28E] dark:border-[#9F6839]/40 rounded-3xl overflow-hidden flex flex-col justify-between shadow-xs transition-all ${
                !activeState ? 'opacity-65' : ''
              }`}
            >
              <div>
                <div className="relative h-36 w-full bg-[#FEE4D7]/50 dark:bg-[#2A150C] overflow-hidden">
                  <img
                    src={img}
                    alt={prod.name}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    onError={(e) => {
                      e.target.src = DEFAULT_PRODUCT_IMAGE
                    }}
                  />
                  <div className="absolute top-2.5 left-2.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#432414]/90 text-[#FEE4D7] font-extrabold text-[10px] backdrop-blur-xs shadow-xs">
                      {prod.category || 'General'}
                    </span>
                  </div>
                  <div className="absolute top-2.5 right-2.5">
                    <button
                      type="button"
                      onClick={(e) => toggleProductActive(prod, e)}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold cursor-pointer transition-transform hover:scale-105 shadow-xs ${
                        activeState
                          ? 'bg-emerald-600 text-white'
                          : 'bg-red-600 text-white'
                      }`}
                      title="Haz clic para activar o desactivar este producto"
                    >
                      {activeState ? '✓ Activo' : '✕ Inactivo'}
                    </button>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-extrabold text-base text-[#432414] dark:text-[#FEE4D7]">{prod.name}</h3>
                  {prod.description && (
                    <p className="text-xs text-[#9F6839] dark:text-[#DABA8C] line-clamp-2 mt-1">
                      {prod.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="px-4 pb-4 pt-2 border-t border-[#D4B28E]/40 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#9F6839] font-semibold block">Precio Venta</span>
                  <span className="text-lg font-extrabold text-[#432414] dark:text-[#FEE4D7]">
                    ${prod.price.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Link
                    to={`/products/${prod.id}/recipe`}
                    className="p-2 rounded-xl bg-[#FEE4D7]/60 dark:bg-[#2E180E] text-[#9F6839] dark:text-[#DABA8C] hover:bg-[#9F6839] hover:text-white transition-colors"
                    title="Ver / Editar Receta"
                  >
                    <BookOpen className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => openEditModal(prod)}
                    className="p-2 rounded-xl text-[#9F6839] hover:bg-[#FEE4D7] dark:hover:bg-[#2E180E] transition-colors cursor-pointer"
                    title="Editar producto"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(prod.id, prod.name)}
                    className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                    title="Eliminar producto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal Crear / Editar Producto */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? `Editar Producto: ${editingProduct.name}` : 'Nuevo Producto'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3.5 rounded-2xl bg-red-50 text-red-700 border border-red-200 text-xs font-bold">
              ⚠️ {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#432414] dark:text-[#DABA8C] uppercase tracking-wider mb-1">
              Nombre del Producto
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Capuccino 12oz"
              required
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#150904] border border-[#D4B28E] text-sm font-semibold text-[#432414] dark:text-[#FEE4D7]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#432414] dark:text-[#DABA8C] uppercase tracking-wider mb-1">
                Precio ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="6000"
                required
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#150904] border border-[#D4B28E] text-sm font-semibold text-[#432414] dark:text-[#FEE4D7]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#432414] dark:text-[#DABA8C] uppercase tracking-wider mb-1">
                Categoría
              </label>
              <input
                type="text"
                list="category-suggestions"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ej. Café, Repostería"
                required
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#150904] border border-[#D4B28E] text-sm font-semibold text-[#432414] dark:text-[#FEE4D7]"
              />
              <datalist id="category-suggestions">
                <option value="Café" />
                <option value="Bebidas Frías" />
                <option value="Repostería" />
                <option value="Snacks" />
                <option value="Desayunos" />
                <option value="Especiales" />
              </datalist>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#432414] dark:text-[#DABA8C] uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-[#9F6839]" /> URL de la Imagen
            </label>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://... o imagen (se guardará en la nube)"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#150904] border border-[#D4B28E] text-sm font-semibold text-[#432414] dark:text-[#FEE4D7]"
            />
            <p className="text-[10px] text-[#9F6839] mt-1 font-medium">
              ℹ️ Se guardará en la nube y se mostrará en todos los dispositivos en tiempo real.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#432414] dark:text-[#DABA8C] uppercase tracking-wider mb-1">
              Descripción
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notas de sabor, preparación o presentación..."
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#150904] border border-[#D4B28E] text-sm font-semibold text-[#432414] dark:text-[#FEE4D7]"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is-active-check"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-[#9F6839] cursor-pointer"
            />
            <label htmlFor="is-active-check" className="text-xs font-bold text-[#432414] dark:text-[#FEE4D7] cursor-pointer">
              Producto Activo y disponible para venta en POS
            </label>
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
              {submitting ? 'Guardando...' : editingProduct ? 'Actualizar Producto' : 'Crear Producto'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}