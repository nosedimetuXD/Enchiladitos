import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import Modal from '../components/Modal'
import { processImageUrl, compressAndReadFile } from '../utils/imageUtils'
import {
  User,
  Lock,
  Camera,
  CheckCircle2,
  Upload,
  Edit2,
  ShieldCheck,
  KeyRound,
  UserCircle
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

  useEffect(() => {
    if (user) {
      setUsername(user.username || '')
      setAvatarInput(user.avatar_url || '')
    }
  }, [user])

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
      setSuccessMsg('¡Perfil y datos de acceso actualizados correctamente!')
    } catch (err) {
      setFormError(err.message || 'No se pudo actualizar el perfil')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header General */}
      <div>
        <h2 className="text-2xl font-black text-[#450a0a] dark:text-[#fef2f2] tracking-tight">
          Mi Perfil & Seguridad de Cuenta
        </h2>
        <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-0.5">
          Gestiona tu nombre de usuario, contraseña de acceso y foto de perfil.
        </p>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid Principal */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Tarjeta Perfil de Usuario */}
        <div className="md:col-span-6 bg-white dark:bg-[#1c0707] border border-red-200 dark:border-red-950/60 rounded-3xl overflow-hidden shadow-xs">
          {/* Banner de Fondo */}
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
            </div>

            {/* Detalles de Cuenta */}
            <div className="space-y-3 text-xs text-amber-900 dark:text-amber-300 pt-3 border-t border-red-200/60 dark:border-red-950">
              <div className="flex items-center justify-between py-1.5 border-b border-red-100 dark:border-red-950/50">
                <span className="font-bold flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                  <User className="w-3.5 h-3.5 text-red-600" /> Nombre de Usuario:
                </span>
                <strong className="text-[#450a0a] dark:text-[#fef2f2] font-black">{user?.username || '—'}</strong>
              </div>

              <div className="flex items-center justify-between py-1.5">
                <span className="font-bold flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Estado:
                </span>
                <strong className="text-emerald-600 font-black">Activa y Segura</strong>
              </div>
            </div>

            {/* Botón de Acción */}
            <button
              onClick={openEditModal}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white text-xs font-black shadow-md cursor-pointer transition-all border border-white/20"
            >
              <Edit2 className="w-4 h-4" />
              <span>Modificar Mis Datos & Contraseña</span>
            </button>
          </div>
        </div>

        {/* Tarjeta de Seguridad y Buenas Prácticas */}
        <div className="md:col-span-6 bg-white dark:bg-[#1c0707] border border-red-200 dark:border-red-950/60 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-red-200/60 dark:border-red-950">
            <ShieldCheck className="w-5 h-5 text-red-600 dark:text-amber-400" />
            <h3 className="font-black text-sm text-[#450a0a] dark:text-[#fef2f2]">
              Seguridad & Acceso
            </h3>
          </div>

          <div className="space-y-3 text-xs text-red-950/70 dark:text-red-200/70 leading-relaxed">
            <div className="p-3.5 rounded-2xl bg-red-50/50 dark:bg-[#240a0a] border border-red-200/60 dark:border-red-950 space-y-1">
              <span className="font-black text-red-600 dark:text-amber-400 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" /> Contraseña Segura
              </span>
              <p className="text-[11px]">
                Puedes cambiar tu contraseña en cualquier momento usando el botón de edición. Se recomienda usar al menos 8 caracteres.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-red-50/50 dark:bg-[#240a0a] border border-red-200/60 dark:border-red-950 space-y-1">
              <span className="font-black text-red-600 dark:text-amber-400 flex items-center gap-1.5">
                <UserCircle className="w-3.5 h-3.5" /> Foto de Perfil
              </span>
              <p className="text-[11px]">
                Sube tu foto personalizada o ingresa un enlace directo para personalizar tu avatar en la barra de navegación.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Editar Perfil */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Modificar Datos de Acceso">
        <form onSubmit={handleSaveProfile} className="space-y-4">
          {formError && (
            <div className="p-3.5 rounded-2xl bg-red-50 text-red-700 border border-red-200 text-xs font-bold">
              ⚠️ {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-black text-[#450a0a] dark:text-amber-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-red-600" /> Nombre de Usuario *
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
              placeholder="Mínimo 8 caracteres (deja vacío para no cambiar)"
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

          <div className="flex gap-3 justify-end pt-3 border-t border-red-100 dark:border-red-950">
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
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
