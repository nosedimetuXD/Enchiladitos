import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import Modal from '../components/Modal'
import { processImageUrl, compressAndReadFile } from '../utils/imageUtils'
import {
  User,
  Lock,
  Camera,
  CheckCircle2,
  Shield,
  Upload,
  TrendingUp,
  Award,
  FileText,
  Edit2,
  Clock,
  DollarSign
} from 'lucide-react'

export default function Profile() {
  const { user, updateUser } = useAuth()

  const rawAvatar = user?.avatar_url || ''
  const currentAvatarUrl = processImageUrl(rawAvatar)

  // Estado del Modal de Edición
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [username, setUsername] = useState(user?.username || '')
  const [password, setPassword] = useState('')
  const [avatarInput, setAvatarInput] = useState(rawAvatar)

  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [formError, setFormError] = useState('')

  // Métricas personales del usuario
  const [userSales, setUserSales] = useState([])
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    async function fetchUserData() {
      if (!user) return
      try {
        const sales = await api.get('/sales?period=all').catch(() => [])
        const safeSales = Array.isArray(sales) ? sales : []
        const currentUname = String(user?.username || '').toLowerCase()
        const currentUid = user?.id

        const mySales = safeSales.filter(
          (s) => s && (
            (currentUid && s.sold_by === currentUid) ||
            (s.sold_by_username && String(s.sold_by_username).toLowerCase() === currentUname)
          )
        )
        setUserSales(mySales)
      } catch (e) {
        console.error('Error cargando datos del usuario', e)
      } finally {
        setLoadingStats(false)
      }
    }
    fetchUserData()
  }, [user])

  useEffect(() => {
    if (user) {
      setUsername(user.username || '')
      setAvatarInput(user.avatar_url || '')
    }
  }, [user])

  // Cálculo de Estadísticas Personales
  const stats = useMemo(() => {
    const safeSales = Array.isArray(userSales) ? userSales : []
    const totalCount = safeSales.length
    const totalRevenue = safeSales.reduce((sum, s) => sum + (Number(s?.total) || 0), 0)
    const avgSale = totalCount > 0 ? totalRevenue / totalCount : 0

    const productCounts = {}
    safeSales.forEach((s) => {
      if (!s) return
      let items = s.items
      if (typeof items === 'string') {
        try { items = JSON.parse(items) } catch (e) { items = [] }
      }
      if (Array.isArray(items)) {
        items.forEach((it) => {
          if (!it) return
          const name = it.product_name || it.ProductName || it.name || 'Producto'
          const q = Number(it.quantity || it.Quantity || 1)
          productCounts[name] = (productCounts[name] || 0) + q
        })
      }
    })

    let topProduct = 'Ninguno aún'
    let maxQty = 0
    Object.entries(productCounts).forEach(([name, qty]) => {
      if (qty > maxQty) {
        maxQty = qty
        topProduct = name
      }
    })

    return {
      totalCount,
      totalRevenue,
      avgSale,
      topProduct,
      maxQty
    }
  }, [userSales])

  function openEditModal() {
    setUsername(user?.username || '')
    setPassword('')
    setAvatarInput(user?.avatar_url || '')
    setFormError('')
    setIsEditModalOpen(true)
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    compressAndReadFile(file, (compressedDataUrl) => {
      setAvatarInput(compressedDataUrl)
    })
  }

  async function handleSaveProfile(e) {
    e.preventDefault()
    setSaving(true)
    setSuccessMsg('')
    setFormError('')

    try {
      const finalAvatar = avatarInput.trim()
      const payload = {
        username: username.trim(),
        avatar_url: finalAvatar
      }
      if (password.trim()) {
        payload.password = password.trim()
      }

      const updatedUser = await api.put('/users/me', payload)
      updateUser({ ...updatedUser, avatar_url: finalAvatar })

      setPassword('')
      setIsEditModalOpen(false)
      setSuccessMsg('¡Perfil y foto guardados correctamente!')
    } catch (err) {
      setFormError(err.message || 'No se pudo actualizar el perfil')
    } finally {
      setSaving(false)
    }
  }

  const roleLabels = {
    owner: 'DUEÑO',
    dueño: 'DUEÑO',
    admin: 'ADMINISTRADOR',
    administrador: 'ADMINISTRADOR',
    employee: 'EMPLEADO',
    empleado: 'EMPLEADO'
  }

  const rawRole = String(user?.role || 'employee').toLowerCase()
  const displayRole = roleLabels[rawRole] || 'EMPLEADO'

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header General */}
      <div>
        <h2 className="text-2xl font-black text-[#450a0a] dark:text-[#fef2f2] tracking-tight">
          Mi Perfil & Estadísticas Personales
        </h2>
        <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-0.5">
          Información de cuenta Enchiladitos, credenciales y resumen de rendimiento en caja
        </p>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Tarjeta Perfil de Usuario (Izquierda / 5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-[#1c0707] border border-red-200 dark:border-red-950/60 rounded-3xl overflow-hidden shadow-xs">
          {/* Banner de Fondo de Marca Enchiladitos */}
          <div className="relative h-28 bg-gradient-to-r from-red-900 via-amber-900 to-red-950 p-4" />

          <div className="px-6 pb-6 pt-0 relative space-y-5">
            {/* Avatar Superpuesto */}
            <div className="-mt-14 flex flex-col items-center text-center">
              {currentAvatarUrl ? (
                <img
                  src={currentAvatarUrl}
                  alt={user?.username || 'Usuario'}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-[#1c0707] shadow-md bg-white mb-2"
                  onError={(e) => {
                    e.target.style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-600 to-amber-600 text-white font-black text-3xl flex items-center justify-center border-4 border-white dark:border-[#1c0707] shadow-md mb-2">
                  {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                </div>
              )}

              <h3 className="text-xl font-black text-[#450a0a] dark:text-[#fef2f2] leading-tight">
                {user?.username || 'Usuario'}
              </h3>
              <div className="mt-1.5">
                <span className="text-[10px] font-black px-3 py-1 rounded-full bg-red-50 dark:bg-[#2e0e0e] text-red-600 dark:text-amber-300 border border-red-200 dark:border-red-900 uppercase tracking-wider inline-flex items-center gap-1">
                  <Shield className="w-3 h-3 text-red-600" />
                  ROL: {displayRole}
                </span>
              </div>
            </div>

            {/* Detalles de Cuenta Organizados */}
            <div className="space-y-2.5 text-xs text-amber-700 dark:text-amber-400 pt-2 border-t border-red-200/60 dark:border-red-950">
              <div className="flex items-center justify-between py-1 border-b border-red-100 dark:border-red-950/50">
                <span className="font-bold flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-red-600" /> Usuario:
                </span>
                <strong className="text-[#450a0a] dark:text-[#fef2f2] font-black">{user?.username || '—'}</strong>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-red-100 dark:border-red-950/50">
                <span className="font-bold flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-red-600" /> Permisos:
                </span>
                <strong className="text-[#450a0a] dark:text-[#fef2f2] font-black">
                  {rawRole === 'owner' || rawRole === 'dueño' ? 'Acceso Total (Dueño)' : rawRole === 'admin' || rawRole === 'administrador' ? 'Administración' : 'Ventas & Caja'}
                </strong>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Cuenta:
                </span>
                <strong className="text-emerald-600 font-black">✓ Activa</strong>
              </div>
            </div>

            {/* Botón de Acción */}
            <button
              onClick={openEditModal}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white text-xs font-black shadow-md cursor-pointer transition-all border border-white/20"
            >
              <Edit2 className="w-4 h-4" />
              <span>Editar Mi Perfil</span>
            </button>
          </div>
        </div>

        {/* Panel de Estadísticas Personales & Últimas Ventas (Derecha / 7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Tarjeta de Métricas */}
          <div className="bg-white dark:bg-[#1c0707] border border-red-200 dark:border-red-950/60 rounded-3xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-[#450a0a] dark:text-[#fef2f2] flex items-center gap-2 pb-2 border-b border-red-200/60 dark:border-red-950">
              <TrendingUp className="w-4 h-4 text-red-600" /> Mis Estadísticas Personales en Caja
            </h3>

            {loadingStats ? (
              <p className="text-xs font-bold text-red-600 py-4 text-center">Cargando tus métricas...</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-red-50/40 dark:bg-[#240a0a] border border-red-200/60 dark:border-red-950 space-y-1">
                  <span className="text-[10px] font-black text-red-600 uppercase tracking-wider block">
                    Ventas Realizadas
                  </span>
                  <p className="text-2xl font-black text-[#450a0a] dark:text-[#fef2f2]">
                    {stats.totalCount}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-red-50/40 dark:bg-[#240a0a] border border-red-200/60 dark:border-red-950 space-y-1">
                  <span className="text-[10px] font-black text-red-600 uppercase tracking-wider block">
                    Ingresos Generados
                  </span>
                  <p className="text-2xl font-black text-emerald-600">
                    ${stats.totalRevenue.toLocaleString()}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-red-50/40 dark:bg-[#240a0a] border border-red-200/60 dark:border-red-950 space-y-1">
                  <span className="text-[10px] font-black text-red-600 uppercase tracking-wider block flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-red-600" /> Ticket Promedio
                  </span>
                  <p className="text-lg font-black text-[#450a0a] dark:text-[#fef2f2]">
                    ${Math.round(stats.avgSale).toLocaleString()}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-red-50/40 dark:bg-[#240a0a] border border-red-200/60 dark:border-red-950 space-y-1">
                  <span className="text-[10px] font-black text-red-600 uppercase tracking-wider block flex items-center gap-1">
                    <Award className="w-3 h-3 text-red-600" /> Más Vendido por Ti
                  </span>
                  <p className="text-xs font-black text-[#450a0a] dark:text-[#fef2f2] truncate" title={stats.topProduct}>
                    {stats.topProduct}
                  </p>
                  {stats.maxQty > 0 && (
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold block">
                      ({stats.maxQty} unidades)
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Historial Reciente de Mis Ventas */}
          <div className="bg-white dark:bg-[#1c0707] border border-red-200 dark:border-red-950/60 rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-red-200/60 dark:border-red-950">
              <h4 className="text-xs font-black text-[#450a0a] dark:text-[#fef2f2] uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-red-600" /> Mis Últimas Ventas Registradas
              </h4>
              <span className="text-[11px] font-black text-amber-600">
                {userSales.length} ventas totales
              </span>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {userSales.length === 0 ? (
                <p className="text-xs text-red-400 py-6 text-center font-bold">
                  Aún no has registrado ventas en el punto de venta.
                </p>
              ) : (
                userSales.slice(0, 8).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-red-50/30 dark:bg-[#240a0a] border border-red-100 dark:border-red-950/60 text-xs hover:border-red-500 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <span className="font-bold text-[#450a0a] dark:text-[#fef2f2] block text-xs">
                        {s.customer_name || 'Cliente General'}
                      </span>
                      <div className="flex items-center gap-2 text-[10px] text-amber-700 dark:text-amber-400 font-bold">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-red-500" />
                          {new Date(s.created_at).toLocaleString('es-CO')}
                        </span>
                        <span>•</span>
                        <span className="uppercase text-[9px] font-black px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950 text-red-600">
                          {s.payment_method || 'Efectivo'}
                        </span>
                      </div>
                    </div>
                    <span className="font-black text-emerald-600 text-sm">
                      ${Number(s.total).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Editar Perfil */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Mi Perfil">
        <form onSubmit={handleSaveProfile} className="space-y-4">
          {formError && (
            <div className="p-3.5 rounded-2xl bg-red-50 text-red-700 border border-red-200 text-xs font-bold">
              ⚠️ {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-black text-[#450a0a] dark:text-amber-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-red-600" /> Nombre de Usuario
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#140505] border border-red-200 dark:border-red-950 text-sm font-bold text-[#450a0a] dark:text-[#fef2f2]"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-[#450a0a] dark:text-amber-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-red-600" /> Nueva Contraseña (Opcional)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres (vacío para conservar)"
              minLength={8}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#140505] border border-red-200 dark:border-red-950 text-sm font-bold text-[#450a0a] dark:text-[#fef2f2]"
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-red-200 dark:border-red-950">
            <label className="block text-xs font-black text-[#450a0a] dark:text-amber-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-red-600" /> Foto de Perfil (Avatar)
            </label>

            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-50 dark:bg-[#240a0a] border border-red-200 dark:border-red-950 hover:bg-red-600 hover:text-white text-xs font-black text-[#450a0a] dark:text-[#fef2f2] transition-all cursor-pointer shadow-xs">
                <Upload className="w-4 h-4" />
                <span>Subir foto</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <span className="text-[11px] text-amber-700 dark:text-amber-400 font-bold">o escribe una URL</span>
            </div>

            <input
              type="text"
              value={avatarInput}
              onChange={(e) => setAvatarInput(e.target.value)}
              placeholder="https://... o foto seleccionada"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#140505] border border-red-200 dark:border-red-950 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2]"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-[#450a0a] dark:text-amber-300 uppercase tracking-wider mb-1">
              Rol de Usuario (Solo Lectura)
            </label>
            <input
              type="text"
              value={displayRole}
              disabled
              className="w-full px-3.5 py-2.5 rounded-2xl bg-red-50/50 dark:bg-[#140505] border border-red-200 text-sm font-black text-red-600 cursor-not-allowed"
            />
          </div>

          <div className="flex gap-3 justify-end pt-3">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2.5 rounded-2xl bg-white dark:bg-[#1c0707] border border-red-200 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white text-xs font-black shadow-md cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar Mi Perfil'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
