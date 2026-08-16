import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import { processImageUrl, compressAndReadFile } from '../utils/imageUtils'
import {
  User,
  Lock,
  Camera,
  CheckCircle2,
  Shield,
  Upload,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Award,
  Calendar,
  FileText
} from 'lucide-react'

export default function Profile() {
  const { user, updateUser } = useAuth()

  const [avatars, setAvatars] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('toffe_user_avatars') || '{}')
    } catch (e) {
      return {}
    }
  })

  const rawAvatar = (user && user.id && avatars[user.id]) || user?.avatar_url || ''
  const currentAvatarUrl = processImageUrl(rawAvatar)

  const [username, setUsername] = useState(user?.username || '')
  const [password, setPassword] = useState('')
  const [avatarInput, setAvatarInput] = useState(rawAvatar)

  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Métricas personales del usuario
  const [userSales, setUserSales] = useState([])
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    async function fetchUserSales() {
      try {
        const sales = await api.get('/sales')
        const mySales = (sales || []).filter(
          (s) => (user?.id && s.sold_by_user_id === user.id) || s.sold_by_username === user?.username
        )
        setUserSales(mySales)
      } catch (e) {
        console.error('Error cargando ventas del usuario', e)
      } finally {
        setLoadingStats(false)
      }
    }
    fetchUserSales()
  }, [user])

  // Cálculo de Estadísticas Personales
  const stats = useMemo(() => {
    const totalCount = userSales.length
    const totalRevenue = userSales.reduce((sum, s) => sum + (s.total || 0), 0)
    const avgSale = totalCount > 0 ? totalRevenue / totalCount : 0

    // Conteo de productos vendidos por este usuario
    const productCounts = {}
    userSales.forEach((s) => {
      ;(s.items || []).forEach((it) => {
        const name = it.product_name || 'Producto'
        productCounts[name] = (productCounts[name] || 0) + (it.quantity || 1)
      })
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

  const previewAvatarUrl = processImageUrl(avatarInput)

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
    setErrorMsg('')

    try {
      const payload = { username: username.trim() }
      if (password.trim()) {
        payload.password = password.trim()
      }

      const updatedUser = await api.put('/users/me', payload)

      const finalAvatar = avatarInput.trim()
      if (user?.id) {
        const nextAvatars = { ...avatars, [user.id]: finalAvatar }
        setAvatars(nextAvatars)
        localStorage.setItem('toffe_user_avatars', JSON.stringify(nextAvatars))
      }

      updateUser({ ...updatedUser, avatar_url: finalAvatar })

      setPassword('')
      setSuccessMsg('¡Perfil y foto actualizados con éxito!')
    } catch (err) {
      setErrorMsg(err.message || 'No se pudo actualizar el perfil')
    } finally {
      setSaving(false)
    }
  }

  const roleLabels = {
    owner: 'DUEÑO',
    admin: 'ADMINISTRADOR',
    employee: 'EMPLEADO'
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-[#432414] dark:text-[#FEE4D7] tracking-tight">
          Mi Perfil & Estadísticas Personales
        </h2>
        <p className="text-xs font-semibold text-[#9F6839] dark:text-[#DABA8C] mt-0.5">
          Gestiona tus credenciales, foto de perfil y revisa tu rendimiento de ventas
        </p>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-red-50 text-red-700 border border-red-200 text-xs font-bold">
          ⚠️ {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formulario de Perfil (Izquierda / 7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#201009] border border-[#D4B28E] dark:border-[#9F6839]/40 rounded-3xl p-6 shadow-xs space-y-6">
          {/* Header Avatar Preview */}
          <div className="flex items-center gap-4 pb-6 border-b border-[#D4B28E]/40">
            <div className="relative">
              {previewAvatarUrl ? (
                <img
                  src={previewAvatarUrl}
                  alt={username}
                  className="w-16 h-16 rounded-full object-cover border-2 border-[#9F6839] shadow-sm"
                  onError={(e) => {
                    e.target.style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[#9F6839] text-[#FEE4D7] font-extrabold text-2xl flex items-center justify-center border-2 border-[#D4B28E] shadow-sm">
                  {username ? username.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-[#432414] dark:text-[#FEE4D7] leading-tight">
                {username || user?.username}
              </h3>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#FEE4D7] dark:bg-[#34180D] text-[#9F6839] dark:text-[#DABA8C] border border-[#D4B28E] uppercase tracking-wider inline-flex items-center gap-1">
                  <Shield className="w-3 h-3 text-[#9F6839]" />
                  Rol: {roleLabels[user?.role] || user?.role}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#432414] dark:text-[#DABA8C] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#9F6839]" /> Nombre de Usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#150904] border border-[#D4B28E] text-sm font-semibold text-[#432414] dark:text-[#FEE4D7]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#432414] dark:text-[#DABA8C] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#9F6839]" /> Nueva Contraseña (Opcional)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres..."
                minLength={8}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#150904] border border-[#D4B28E] text-sm font-semibold text-[#432414] dark:text-[#FEE4D7]"
              />
            </div>

            {/* Subir Foto de Perfil */}
            <div className="space-y-2 pt-2 border-t border-[#D4B28E]/30">
              <label className="block text-xs font-bold text-[#432414] dark:text-[#DABA8C] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-[#9F6839]" /> Foto de Perfil (Avatar)
              </label>

              {/* Botón de subida de archivo desde almacenamiento */}
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#FEE4D7] dark:bg-[#2A150C] border border-[#D4B28E] hover:bg-[#9F6839] hover:text-white text-xs font-extrabold text-[#432414] dark:text-[#FEE4D7] transition-all cursor-pointer shadow-xs">
                  <Upload className="w-4 h-4" />
                  <span>Subir foto del dispositivo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                <span className="text-[11px] text-[#9F6839] font-medium">o pega un enlace abajo</span>
              </div>

              <input
                type="text"
                value={avatarInput}
                onChange={(e) => setAvatarInput(e.target.value)}
                placeholder="https://drive.google.com/file/d/... o enlace directo de imagen"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#150904] border border-[#D4B28E] text-xs font-semibold text-[#432414] dark:text-[#FEE4D7]"
              />
              <p className="text-[10px] text-[#9F6839] font-medium">
                💡 Soporta imágenes directas, archivos de tu dispositivo o enlaces de Google Drive (se convierten automáticamente).
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#432414] dark:text-[#DABA8C] uppercase tracking-wider mb-1">
                Rol de Usuario (Solo Lectura)
              </label>
              <input
                type="text"
                value={roleLabels[user?.role] || user?.role || ''}
                disabled
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FEE4D7]/40 dark:bg-[#150904] border border-[#D4B28E] text-sm font-extrabold text-[#9F6839] cursor-not-allowed"
              />
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 rounded-2xl bg-[#9F6839] hover:bg-[#835229] text-white text-xs font-extrabold shadow-md cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Guardando Cambios...' : 'Guardar Mi Perfil'}
              </button>
            </div>
          </form>
        </div>

        {/* Panel de Estadísticas Personales del Usuario (Derecha / 5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-[#201009] border border-[#D4B28E] dark:border-[#9F6839]/40 rounded-3xl p-5 shadow-xs space-y-4">
            <h3 className="text-base font-extrabold text-[#432414] dark:text-[#FEE4D7] flex items-center gap-2 pb-2 border-b border-[#D4B28E]/40">
              <TrendingUp className="w-4 h-4 text-[#9F6839]" /> Mis Estadísticas Personales
            </h3>

            {loadingStats ? (
              <p className="text-xs font-semibold text-[#9F6839] py-4 text-center">Cargando tus métricas...</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#FEE4D7]/40 dark:bg-[#2A150C] border border-[#D4B28E]/60 space-y-1">
                  <span className="text-[10px] font-bold text-[#9F6839] uppercase tracking-wider block">
                    Ventas Realizadas
                  </span>
                  <p className="text-xl font-extrabold text-[#432414] dark:text-[#FEE4D7]">
                    {stats.totalCount}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FEE4D7]/40 dark:bg-[#2A150C] border border-[#D4B28E]/60 space-y-1">
                  <span className="text-[10px] font-bold text-[#9F6839] uppercase tracking-wider block">
                    Ingresos Generados
                  </span>
                  <p className="text-xl font-extrabold text-emerald-600">
                    ${stats.totalRevenue.toLocaleString()}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FEE4D7]/40 dark:bg-[#2A150C] border border-[#D4B28E]/60 space-y-1">
                  <span className="text-[10px] font-bold text-[#9F6839] uppercase tracking-wider block">
                    Venta Promedio
                  </span>
                  <p className="text-lg font-extrabold text-[#432414] dark:text-[#FEE4D7]">
                    ${Math.round(stats.avgSale).toLocaleString()}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FEE4D7]/40 dark:bg-[#2A150C] border border-[#D4B28E]/60 space-y-1">
                  <span className="text-[10px] font-bold text-[#9F6839] uppercase tracking-wider block flex items-center gap-1">
                    <Award className="w-3 h-3 text-[#9F6839]" /> Más Vendido
                  </span>
                  <p className="text-xs font-bold text-[#432414] dark:text-[#FEE4D7] truncate" title={stats.topProduct}>
                    {stats.topProduct}
                  </p>
                  {stats.maxQty > 0 && (
                    <span className="text-[10px] text-[#9F6839] font-semibold block">
                      ({stats.maxQty} unidades)
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Historial Reciente de Mis Ventas */}
          <div className="bg-white dark:bg-[#201009] border border-[#D4B28E] dark:border-[#9F6839]/40 rounded-3xl p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-extrabold text-[#432414] dark:text-[#FEE4D7] uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#9F6839]" /> Mis Últimas Ventas
            </h4>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {userSales.length === 0 ? (
                <p className="text-xs text-[#9F6839] py-4 text-center font-medium">Aún no registras ventas en caja</p>
              ) : (
                userSales.slice(0, 6).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-[#FEE4D7]/30 dark:bg-[#2A150C] border border-[#D4B28E]/50 text-xs"
                  >
                    <div>
                      <span className="font-bold text-[#432414] dark:text-[#FEE4D7] block">
                        {s.customer_name || 'Cliente General'}
                      </span>
                      <span className="text-[10px] text-[#9F6839] font-semibold">
                        {new Date(s.created_at).toLocaleString()}
                      </span>
                    </div>
                    <span className="font-extrabold text-emerald-600 text-sm">
                      ${s.total.toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
