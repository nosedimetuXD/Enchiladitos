import { useEffect, useState, useMemo } from 'react'
import { api } from '../api/client'
import Modal from '../components/Modal'
import MetricLineChart from '../components/MetricLineChart'
import { compressAndReadFile } from '../utils/imageUtils'
import {
  Flame,
  Plus,
  Edit2,
  Trash2,
  Search,
  Image as ImageIcon,
  Upload,
  CheckCircle2,
  XCircle,
  Package,
  AlertTriangle,
  ArrowUpDown,
  Tag,
  Boxes,
  Minus,
  Sparkles
} from 'lucide-react'

const DEFAULT_PRODUCT_IMAGE = '/default-product.png'

export default function Products() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [stockFilter, setStockFilter] = useState('all') // 'all', 'low', 'out'
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')

  // Modal Crear / Editar Producto
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('0')
  const [minStockAlert, setMinStockAlert] = useState('5')
  const [category, setCategory] = useState('Gomitas')
  const [tags, setTags] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Modal Ajuste Rápido de Stock / Merma
  const [isStockModalOpen, setIsStockModalOpen] = useState(false)
  const [stockProduct, setStockProduct] = useState(null)
  const [stockDelta, setStockDelta] = useState(0)
  const [stockReason, setStockReason] = useState('Reabastecimiento')
  const [stockSubmitting, setStockSubmitting] = useState(false)

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

    function handleRevalidate() {
      if (document.visibilityState === 'visible') {
        loadProducts()
      }
    }

    window.addEventListener('focus', handleRevalidate)
    document.addEventListener('visibilitychange', handleRevalidate)

    return () => {
      window.removeEventListener('focus', handleRevalidate)
      document.removeEventListener('visibilitychange', handleRevalidate)
    }
  }, [])

  function openCreateModal() {
    setEditingProduct(null)
    setName('')
    setDescription('')
    setPrice('')
    setStock('0')
    setMinStockAlert('5')
    setCategory('Gomitas')
    setTags('')
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
    setStock(String(prod.stock ?? 0))
    setMinStockAlert(String(prod.min_stock_alert ?? 5))
    setCategory(prod.category || 'Gomitas')
    setTags(prod.tags || '')
    setImageUrl(prod.image_url || '')
    const currentActive = typeof prod.active !== 'undefined' ? prod.active : (prod.is_active ?? true)
    setIsActive(currentActive)
    setFormError('')
    setIsModalOpen(true)
  }

  function openStockModal(prod) {
    setStockProduct(prod)
    setStockDelta(0)
    setStockReason('Reabastecimiento')
    setIsStockModalOpen(true)
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    compressAndReadFile(file, (compressedDataUrl) => {
      setImageUrl(compressedDataUrl)
    })
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
        stock: Number(stock) || 0,
        min_stock_alert: Number(minStockAlert) || 5,
        category: category.trim() || 'Gomitas',
        tags: tags.trim(),
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

  async function handleStockAdjust(e) {
    e.preventDefault()
    if (!stockProduct || stockDelta === 0) return
    setStockSubmitting(true)
    try {
      await api.patch(`/products/${stockProduct.id}/stock`, {
        delta: Number(stockDelta),
        reason: stockReason
      })
      setIsStockModalOpen(false)
      await loadProducts()
    } catch (err) {
      alert(err.message || 'Error ajustando stock')
    } finally {
      setStockSubmitting(false)
    }
  }

  async function quickAdjustStock(prod, delta) {
    try {
      await api.patch(`/products/${prod.id}/stock`, { delta })
      setProducts((prev) =>
        prev.map((p) => (p.id === prod.id ? { ...p, stock: Math.max(0, (p.stock || 0) + delta) } : p))
      )
    } catch (err) {
      alert('Error ajustando stock')
    }
  }

  async function toggleProductActive(prod, e) {
    e.stopPropagation()
    const currentActive = typeof prod.active !== 'undefined' ? prod.active : (prod.is_active ?? true)
    try {
      const updated = { ...prod, active: !currentActive, is_active: !currentActive }
      await api.put(`/products/${prod.id}`, updated)
      setProducts((prev) =>
        prev.map((p) => (p.id === prod.id ? { ...p, active: !currentActive, is_active: !currentActive } : p))
      )
    } catch (err) {
      alert('No se pudo actualizar el estado del producto')
    }
  }

  async function handleDeleteProduct(prod) {
    if (!window.confirm(`¿Estás seguro de eliminar "${prod.name}"?`)) return

    try {
      await api.delete(`/products/${prod.id}`)
      setProducts((prev) => prev.filter((p) => p.id !== prod.id))
    } catch (err) {
      alert(err.message || 'No se pudo eliminar el producto')
    }
  }

  // Filtrado de productos
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat = selectedCategory === 'Todos' || p.category === selectedCategory
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        p.name.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query)) ||
        (p.tags && p.tags.toLowerCase().includes(query))

      const currentStock = p.stock ?? 0
      const minAlert = p.min_stock_alert ?? 5
      let matchesStock = true
      if (stockFilter === 'low') matchesStock = currentStock <= minAlert && currentStock > 0
      if (stockFilter === 'out') matchesStock = currentStock <= 0

      return matchesCat && matchesSearch && matchesStock
    })
  }, [products, selectedCategory, searchQuery, stockFilter])

  // Estadísticas rápidas de inventario
  const totalStockUnits = useMemo(() => products.reduce((acc, p) => acc + (p.stock || 0), 0), [products])
  const totalStockValue = useMemo(() => products.reduce((acc, p) => acc + (p.stock || 0) * (p.price || 0), 0), [products])
  const lowStockCount = useMemo(() => products.filter((p) => (p.stock || 0) <= (p.min_stock_alert || 5)).length, [products])

  // Datos para MetricLineChart del inventario
  const productsTrendData = useMemo(() => {
    const sorted = [...products].sort((a, b) => ((b.stock || 0) * (b.price || 0)) - ((a.stock || 0) * (a.price || 0)))
    return sorted.slice(0, 8).map((p) => ({
      label: p.name.length > 7 ? p.name.substring(0, 7) + '..' : p.name,
      value: (p.stock || 0) * (p.price || 0),
      secondaryValue: p.price || 0
    }))
  }, [products])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#1a0606] p-5 rounded-2xl border border-red-200/60 dark:border-red-950/60 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-red-100 dark:bg-red-950 text-red-600 dark:text-amber-400">
              <Flame className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-[#450a0a] dark:text-[#fef2f2]">
              Productos & Inventario de Stock
            </h1>
          </div>
          <p className="text-xs text-red-900/60 dark:text-red-300/60 mt-0.5">
            Gestiona tu catálogo empaquetado, precios, existencias disponibles y alertas.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Producto</span>
        </button>
      </div>

      {/* Unified Metrics Bar — Asymmetric 2:1 Hero Layout (Linear Style) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Large Hero Box (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1a0606] border border-red-200/60 dark:border-red-950/60 rounded-xl p-3.5 sm:p-4 flex flex-col justify-between shadow-xs relative overflow-hidden">
          {/* Header Row: Title & Balance + Badge */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-red-900/70 dark:text-red-300/70 block">
                Valor en Inventario
              </span>
              <div className="mt-0.5 text-2xl sm:text-3xl font-black tracking-tight text-[#450a0a] dark:text-[#fef2f2] tabular-nums">
                ${Number(totalStockValue).toLocaleString('es-CO')}
              </div>
            </div>

            <div className="text-right">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${lowStockCount === 0 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${lowStockCount === 0 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                {lowStockCount === 0 ? 'Stock Saludable' : `${lowStockCount} con Alerta`}
              </span>
              <div className="flex items-center justify-end gap-3 text-[10px] font-semibold mt-1">
                <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Valor Stock
                </span>
                <span className="inline-flex items-center gap-1 text-red-600 dark:text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-red-600 dark:bg-amber-400" /> Precio Venta
                </span>
              </div>
            </div>
          </div>

          {/* Center Body: Full-Width MetricLineChart */}
          <div className="my-2.5 py-1 w-full">
            <MetricLineChart
              data={productsTrendData}
              line1Color="#10b981"
              line2Color="#dc2626"
              line1Label="Valor Stock"
              line2Label="Precio Venta"
              hasSecondary={productsTrendData.length > 0}
              formatValue={(v) => `$${Number(v).toLocaleString('es-CO')}`}
              height={125}
            />
          </div>

          {/* Sub-breakdown 3 columns at bottom */}
          <div className="mt-3 pt-2.5 border-t border-red-200/40 dark:border-red-950/40 grid grid-cols-3 gap-2">
            <div>
              <span className="text-[10px] font-semibold text-red-900/60 dark:text-red-300/60 block uppercase tracking-wider">
                Total Productos
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#450a0a] dark:text-[#fef2f2] tabular-nums block mt-0.5">
                {products.length} catálogo
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-red-900/60 dark:text-red-300/60 block uppercase tracking-wider">
                Unidades en Stock
              </span>
              <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums block mt-0.5">
                {totalStockUnits.toLocaleString()} uds
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-red-900/60 dark:text-red-300/60 block uppercase tracking-wider">
                Precio Promedio
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#450a0a] dark:text-[#fef2f2] tabular-nums block mt-0.5">
                ${Math.round(products.length > 0 ? products.reduce((acc, p) => acc + (p.price || 0), 0) / products.length : 0).toLocaleString('es-CO')}
              </span>
            </div>
          </div>
        </div>

        {/* Stacked Side Cards (1 col) */}
        <div className="lg:col-span-1 flex flex-col gap-2">
          <div className="bg-white dark:bg-[#1a0606] border border-red-200/60 dark:border-red-950/60 rounded-xl p-2.5 sm:p-3 flex-1 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-red-900/70 dark:text-red-300/70">
              <span>Total Productos</span>
              <Boxes className="w-3.5 h-3.5 text-red-600 dark:text-amber-400" />
            </div>
            <div className="my-0.5 text-base sm:text-lg font-black tracking-tight text-[#450a0a] dark:text-[#fef2f2] tabular-nums">
              {products.length}
            </div>
            <span className="text-[10px] text-red-900/60 dark:text-red-300/60 font-normal">
              {products.filter((p) => p.active ?? p.is_active ?? true).length} ítems activos para venta
            </span>
          </div>

          <div className="bg-white dark:bg-[#1a0606] border border-red-200/60 dark:border-red-950/60 rounded-xl p-2.5 sm:p-3 flex-1 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-red-900/70 dark:text-red-300/70">
              <span>Unidades en Stock</span>
              <Package className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="my-0.5 text-base sm:text-lg font-black tracking-tight text-amber-600 dark:text-amber-400 tabular-nums">
              {totalStockUnits.toLocaleString()} uds
            </div>
            <span className="text-[10px] text-red-900/60 dark:text-red-300/60 font-normal">
              {totalStockUnits > 0 ? 'Disponibilidad inmediata' : 'Sin existencias registradas'}
            </span>
          </div>

          <div className="bg-white dark:bg-[#1a0606] border border-red-200/60 dark:border-red-950/60 rounded-xl p-2.5 sm:p-3 flex-1 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-red-900/70 dark:text-red-300/70">
              <span>Alertas de Stock</span>
              <AlertTriangle className={`w-3.5 h-3.5 ${lowStockCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
            </div>
            <div className={`my-0.5 text-base sm:text-lg font-black tracking-tight tabular-nums ${lowStockCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {lowStockCount} {lowStockCount === 1 ? 'producto' : 'productos'}
            </div>
            <span className="text-[10px] text-red-900/60 dark:text-red-300/60 font-normal">
              {lowStockCount === 0 ? 'Todas las referencias con stock óptimo' : 'Requieren reabastecimiento'}
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col md:flex-row items-center gap-2.5 bg-white dark:bg-[#1a0606] p-2.5 sm:p-3 rounded-2xl border border-red-200/60 dark:border-red-950/60">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-red-900/40 dark:text-red-400/40" />
          <input
            type="text"
            placeholder="Buscar por nombre, descripción o etiquetas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-red-50/50 dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 text-xs font-medium text-[#450a0a] dark:text-[#fef2f2] focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>

        {/* Filtro Categoría */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-0.5 md:pb-0">
          {categories.map((cat) => (
            <button
              type="button"
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-red-600 text-white font-bold'
                  : 'text-red-900/70 dark:text-red-300/70 hover:bg-red-50 dark:hover:bg-[#200808]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Filtro Estado Stock */}
        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-xl bg-red-50/60 dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 text-xs font-medium text-[#450a0a] dark:text-[#fef2f2] cursor-pointer focus:outline-none"
        >
          <option value="all">Todo el Stock</option>
          <option value="low">Stock Bajo</option>
          <option value="out">Agotados</option>
        </select>
      </div>

      {/* Grid de Productos */}
      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-600 border-t-transparent"></div>
          <p className="text-sm font-bold text-red-900/60 dark:text-red-400/60 mt-3">Cargando productos...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#1c0707] rounded-3xl border border-dashed border-red-200 dark:border-red-950 p-8">
          <Package className="w-12 h-12 mx-auto text-red-400/40 mb-3" />
          <p className="text-base font-black text-[#450a0a] dark:text-[#fef2f2]">No se encontraron productos</p>
          <p className="text-xs font-medium text-red-900/50 dark:text-red-400/50 mt-1">
            Intenta cambiar los filtros de búsqueda o agrega un nuevo producto.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {filteredProducts.map((prod) => {
            const currentStock = prod.stock ?? 0
            const minAlert = prod.min_stock_alert ?? 5
            const isLowStock = currentStock <= minAlert && currentStock > 0
            const isOutOfStock = currentStock <= 0
            const active = typeof prod.active !== 'undefined' ? prod.active : (prod.is_active ?? true)

            return (
              <div
                key={prod.id}
                className={`flex flex-col justify-between bg-white dark:bg-[#1a0606] rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs hover:shadow-md ${
                  !active
                    ? 'border-gray-200 dark:border-zinc-800 opacity-60'
                    : isOutOfStock
                    ? 'border-rose-400/60 dark:border-rose-900/60'
                    : isLowStock
                    ? 'border-amber-300 dark:border-amber-900/60'
                    : 'border-red-200/60 dark:border-red-950/60 hover:border-red-500'
                }`}
              >
                <div>
                  {/* Imagen y badges */}
                  <div className="relative h-36 bg-black/10 overflow-hidden group">
                    <img
                      src={prod.image_url || DEFAULT_PRODUCT_IMAGE}
                      alt={prod.name}
                      onError={(e) => {
                        e.target.src = DEFAULT_PRODUCT_IMAGE
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    {/* Badge Categoría */}
                    <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold tracking-wider uppercase">
                      {prod.category || 'General'}
                    </span>

                    {/* Botón Activo/Inactivo */}
                    <button
                      type="button"
                      onClick={(e) => toggleProductActive(prod, e)}
                      className={`absolute top-2.5 right-2.5 p-1 rounded-lg backdrop-blur-xs transition-transform cursor-pointer ${
                        active
                          ? 'bg-emerald-500 text-white hover:scale-105'
                          : 'bg-zinc-700 text-zinc-300 hover:scale-105'
                      }`}
                      title={active ? 'Desactivar Producto' : 'Activar Producto'}
                    >
                      {active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    </button>

                    {/* Badge de Stock en imagen */}
                    <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between">
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-bold flex items-center gap-1 backdrop-blur-md shadow-xs ${
                          isOutOfStock
                            ? 'bg-red-600/90 text-white'
                            : isLowStock
                            ? 'bg-amber-500/90 text-white'
                            : 'bg-emerald-600/90 text-white'
                        }`}
                      >
                        <Package className="w-3 h-3" />
                        <span>
                          {isOutOfStock ? 'Agotado (0)' : `${currentStock} en stock`}
                        </span>
                      </span>

                      <span className="text-white font-bold text-sm drop-shadow-md tabular-nums">
                        ${Number(prod.price).toLocaleString('es-CO')}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3 space-y-1.5">
                    <h3 className="font-bold text-xs text-[#450a0a] dark:text-[#fef2f2] leading-snug line-clamp-1">
                      {prod.name}
                    </h3>
                    {prod.description && (
                      <p className="text-[11px] text-red-900/70 dark:text-red-300/70 line-clamp-2">
                        {prod.description}
                      </p>
                    )}
                    {prod.tags && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {prod.tags.split(',').map((t, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.2 rounded-md bg-red-100/70 dark:bg-red-950 text-red-700 dark:text-amber-400 text-[9px] font-semibold flex items-center gap-1"
                          >
                            <Tag className="w-2.5 h-2.5" />
                            {t.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Acciones y control de stock */}
                <div className="p-2.5 border-t border-red-200/40 dark:border-red-950/40 bg-red-50/20 dark:bg-[#140505] flex items-center justify-between gap-2">
                  {/* Ajustes rápidos de stock +/- */}
                  <div className="flex items-center gap-0.5 bg-white dark:bg-[#1c0707] p-0.5 rounded-xl border border-red-200/60 dark:border-red-950/60">
                    <button
                      type="button"
                      onClick={() => quickAdjustStock(prod, -1)}
                      className="p-1 rounded-lg text-red-600 dark:text-amber-400 hover:bg-red-100 dark:hover:bg-red-950 cursor-pointer"
                      title="Restar 1 unidad"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openStockModal(prod)}
                      className="px-2 py-0.5 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] hover:underline cursor-pointer tabular-nums"
                      title="Ajustar inventario / Registrar merma"
                    >
                      {currentStock}
                    </button>
                    <button
                      type="button"
                      onClick={() => quickAdjustStock(prod, 1)}
                      className="p-1 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950 cursor-pointer"
                      title="Sumar 1 unidad"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Botones de Editar y Borrar */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(prod)}
                      className="p-1.5 rounded-lg text-red-700 dark:text-amber-400 hover:text-[#450a0a] dark:hover:text-white hover:bg-red-100 dark:hover:bg-[#2c0b0b] transition-colors cursor-pointer"
                      title="Editar Producto"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(prod)}
                      className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Eliminar Producto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Crear / Editar Producto */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-2xl bg-red-100 text-red-700 text-xs font-bold">{formError}</div>
          )}

          <div>
            <label className="block text-xs font-black uppercase text-red-950 dark:text-red-200 mb-1">
              Nombre del Producto *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Gomitas Escarchadas Picantes"
              className="w-full px-4 py-2.5 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200/80 dark:border-red-950 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-red-950 dark:text-red-200 mb-1">
                Precio ($) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="50"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="4000"
                className="w-full px-4 py-2.5 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200/80 dark:border-red-950 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-red-950 dark:text-red-200 mb-1">
                Stock Actual (Uds) *
              </label>
              <input
                type="number"
                required
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="20"
                className="w-full px-4 py-2.5 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200/80 dark:border-red-950 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-red-950 dark:text-red-200 mb-1">
                Alerta Stock Mínimo
              </label>
              <input
                type="number"
                min="1"
                value={minStockAlert}
                onChange={(e) => setMinStockAlert(e.target.value)}
                placeholder="5"
                className="w-full px-4 py-2.5 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200/80 dark:border-red-950 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-red-950 dark:text-red-200 mb-1">
                Categoría
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Gomitas, Sparkies, Combos..."
                className="w-full px-4 py-2.5 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200/80 dark:border-red-950 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-red-950 dark:text-red-200 mb-1">
                Etiquetas (Tags)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Favorito, Más Vendido, Picante"
                className="w-full px-4 py-2.5 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200/80 dark:border-red-950 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-red-950 dark:text-red-200 mb-1">
              Descripción Opcional
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles sobre presentación, peso o empaque..."
              className="w-full px-4 py-2 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200/80 dark:border-red-950 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Imagen */}
          <div>
            <label className="block text-xs font-black uppercase text-red-950 dark:text-red-200 mb-1">
              Imagen del Producto
            </label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="URL de la imagen o sube un archivo"
                className="flex-1 px-4 py-2.5 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200/80 dark:border-red-950 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <label className="p-2.5 rounded-2xl bg-red-100 dark:bg-red-950 text-red-600 dark:text-amber-400 hover:bg-red-200 transition-colors cursor-pointer shrink-0">
                <Upload className="w-4 h-4" />
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
            />
            <label htmlFor="isActive" className="text-xs font-black text-[#450a0a] dark:text-[#fef2f2] cursor-pointer">
              Producto disponible para la venta en el POS
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-red-100 dark:border-red-950">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-5 py-2.5 rounded-2xl text-xs font-bold text-red-950/70 dark:text-red-200/70 hover:bg-red-100 dark:hover:bg-red-950 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white text-xs font-black shadow-md cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : editingProduct ? 'Actualizar Producto' : 'Crear Producto'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Ajuste Rápido de Stock / Registro de Merma */}
      <Modal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        title={`Ajustar Stock: ${stockProduct?.name || ''}`}
      >
        <form onSubmit={handleStockAdjust} className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-[#200808] border border-amber-200 dark:border-amber-950 flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 dark:text-amber-200">Stock Actual:</span>
            <span className="text-lg font-black text-amber-900 dark:text-amber-200">
              {stockProduct?.stock ?? 0} unidades
            </span>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-red-950 dark:text-red-200 mb-1">
              Cambio en el Stock (Unidades a sumar o restar) *
            </label>
            <input
              type="number"
              required
              value={stockDelta}
              onChange={(e) => setStockDelta(Number(e.target.value))}
              placeholder="Ej. +10 o -2"
              className="w-full px-4 py-2.5 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200/80 dark:border-red-950 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <p className="text-[11px] font-medium text-red-900/60 dark:text-red-400/60 mt-1">
              Resultado final:{' '}
              <strong className="text-red-600 dark:text-amber-400">
                {Math.max(0, (stockProduct?.stock ?? 0) + Number(stockDelta))} unidades
              </strong>
            </p>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-red-950 dark:text-red-200 mb-1">
              Motivo del Ajuste
            </label>
            <select
              value={stockReason}
              onChange={(e) => setStockReason(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200/80 dark:border-red-950 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] cursor-pointer"
            >
              <option value="Reabastecimiento">Reabastecimiento de producción / Lote nuevo</option>
              <option value="Merma">Merma / Producto dañado o vencido</option>
              <option value="Corrección de conteo">Corrección de conteo físico</option>
              <option value="Degustación">Degustación / Muestra a clientes</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-red-100 dark:border-red-950">
            <button
              type="button"
              onClick={() => setIsStockModalOpen(false)}
              className="px-5 py-2.5 rounded-2xl text-xs font-bold text-red-950/70 dark:text-red-200/70 hover:bg-red-100 dark:hover:bg-red-950 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={stockSubmitting || stockDelta === 0}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white text-xs font-black shadow-md cursor-pointer disabled:opacity-50"
            >
              {stockSubmitting ? 'Guardando...' : 'Aplicar Ajuste'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}