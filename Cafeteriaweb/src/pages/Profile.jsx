import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import { User, Lock, Camera, CheckCircle2, Shield } from 'lucide-react'

export default function Profile() {
  const { user, updateUser } = useAuth()

  const [avatars, setAvatars] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('toffe_user_avatars') || '{}')
    } catch (e) {
      return {}
    }
  })

  const currentAvatar = (user && user.id && avatars[user.id]) || user?.avatar_url || ''

  const [username, setUsername] = useState(user?.username || '')
  const [password, setPassword] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(currentAvatar)

  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const roleLabels = {
    owner: 'DUEÑO',
    admin: 'ADMINISTRADOR',
    employee: 'EMPLEADO'
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

      if (user?.id) {
        const nextAvatars = { ...avatars, [user.id]: avatarUrl.trim() }
        setAvatars(nextAvatars)
        localStorage.setItem('toffe_user_avatars', JSON.stringify(nextAvatars))
      }

      updateUser({ ...updatedUser, avatar_url: avatarUrl.trim() })

      setPassword('')
      setSuccessMsg('¡Perfil actualizado con éxito!')
    } catch (err) {
      setErrorMsg(err.message || 'No se pudo actualizar el perfil')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-[#432414] dark:text-[#FEE4D7] tracking-tight">
          Mi Perfil & Ajustes de Cuenta
        </h2>
        <p className="text-xs font-semibold text-[#9F6839] dark:text-[#DABA8C] mt-0.5">
          Gestiona tu nombre de usuario, clave de acceso y foto de perfil
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

      <div className="bg-white dark:bg-[#201009] border border-[#D4B28E] dark:border-[#9F6839]/40 rounded-3xl p-6 shadow-xs space-y-6">
        {/* Header Avatar Preview */}
        <div className="flex items-center gap-4 pb-6 border-b border-[#D4B28E]/40">
          <div className="relative">
            {avatarUrl.trim() ? (
              <img
                src={avatarUrl.trim()}
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
              <Lock className="w-3.5 h-3.5 text-[#9F6839]" /> Nueva Contraseña (Dejar en blanco para no cambiar)
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

          <div>
            <label className="block text-xs font-bold text-[#432414] dark:text-[#DABA8C] uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-[#9F6839]" /> URL de Foto de Perfil (Avatar)
            </label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://ejemplo.com/mi-foto.jpg"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#150904] border border-[#D4B28E] text-sm font-semibold text-[#432414] dark:text-[#FEE4D7]"
            />
            <p className="text-[10px] text-[#9F6839] mt-1 font-medium">
              Enlace directo a tu imagen para mostrarla en el menú y encabezados del sistema.
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
            <p className="text-[10px] text-[#9F6839] mt-1 font-semibold">
              🔒 El rol del usuario solo puede ser modificado por el Dueño desde la sección de Usuarios.
            </p>
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
    </div>
  )
}
