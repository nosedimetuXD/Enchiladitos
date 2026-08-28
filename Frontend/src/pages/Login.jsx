import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Lock, User, Flame } from 'lucide-react'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(username, password)
      navigate('/')
    } catch (err) {
      setError('Usuario o contraseña incorrectos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative bg-[#140505] overflow-hidden p-4">
      {/* Background Subtle Gradient & Glow */}
      <div className="absolute inset-0 bg-radial from-red-950/40 via-[#140505] to-[#0a0202] pointer-events-none" />
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-[#1c0707] border border-red-950/80 rounded-3xl p-8 shadow-2xl z-10 backdrop-blur-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-black/40 border-2 border-red-600/60 shadow-xl mb-4 overflow-hidden p-1.5 group">
            <img src="/logo.png" alt="Enchiladitos Logo" className="w-full h-full object-contain rounded-2xl group-hover:scale-105 transition-transform" />
          </div>
          <span className="font-black text-white text-3xl tracking-tight leading-none block bg-gradient-to-r from-amber-400 via-orange-400 to-red-500 bg-clip-text text-transparent">
            ENCHILADITOS
          </span>
          <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mt-1.5">
            Sabor, Chamoy y Fuego
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/60 text-[10px] font-extrabold text-amber-300 border border-red-900/60">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            Punto de Venta & Control de Inventario
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-950/70 text-red-300 border border-red-800 p-3 rounded-2xl text-xs font-bold text-center animate-shake">
              ⚠️ {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-amber-200/90 uppercase tracking-wider mb-1">
              Nombre de Usuario
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <User className="w-4 h-4 text-red-500" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingresa tu usuario"
                required
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#140505] border border-red-950 text-sm font-semibold text-white placeholder-red-300/30 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-amber-200/90 uppercase tracking-wider mb-1">
              Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Lock className="w-4 h-4 text-red-500" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#140505] border border-red-950 text-sm font-semibold text-white placeholder-red-300/30 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 hover:from-red-700 hover:via-orange-700 hover:to-amber-700 text-white font-black text-sm shadow-lg hover:shadow-red-600/30 transition-all duration-200 disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Iniciando sesión...' : 'Ingresar a Caja / Sistema'}
          </button>
        </form>

        <p className="text-center text-[10px] font-semibold text-red-400/60 mt-6">
          Enchiladitos &copy; {new Date().getFullYear()} — Todos los derechos reservados
        </p>
      </div>
    </div>
  )
}