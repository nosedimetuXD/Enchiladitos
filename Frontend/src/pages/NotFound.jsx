import { useNavigate, Link } from 'react-router-dom'
import { Home, ArrowLeft, Flame, AlertCircle } from 'lucide-react'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0303] text-white p-4 relative overflow-hidden select-none">
      {/* Luces de fondo decorativas */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-[#180505] border border-red-900/60 rounded-3xl p-8 shadow-2xl relative z-10 backdrop-blur-sm text-center">
        {/* Logo o Icono de Marca */}
        <div className="relative inline-block mb-4">
          <img
            src="/logo.png"
            alt="Enchiladitos Logo"
            className="w-20 h-20 rounded-3xl shadow-xl shadow-red-950/50 object-contain mx-auto border-2 border-red-600/40 p-1 bg-[#120303]"
          />
        </div>

        {/* Indicador 404 */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-red-950/80 border border-red-800/60 text-xs font-black text-amber-400 tracking-widest uppercase mb-3">
          <AlertCircle className="w-3.5 h-3.5 text-red-500" />
          <span>Error 404</span>
        </div>

        <h1 className="text-3xl font-black tracking-tight text-white uppercase">
          Página No Encontrada
        </h1>

        <p className="text-xs font-medium text-red-200/70 mt-2 leading-relaxed">
          La ruta a la que intentas ingresar no existe, fue movida o no está disponible en el sistema.
        </p>

        {/* Botones de Navegación */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-red-900/60 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span>Volver Atrás</span>
          </button>

          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-black text-xs shadow-md shadow-red-950/60 transition-all cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Ir al Inicio / POS</span>
          </Link>
        </div>

        {/* Footer sutil */}
        <div className="mt-8 pt-4 border-t border-red-950/60 flex items-center justify-center gap-1 text-[11px] font-bold text-red-300/40 uppercase tracking-widest">
          <Flame className="w-3.5 h-3.5 text-orange-400" />
          <span>Enchiladitos POS</span>
        </div>
      </div>
    </div>
  )
}
