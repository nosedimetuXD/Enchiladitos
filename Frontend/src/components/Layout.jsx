import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { processImageUrl } from '../utils/imageUtils'
import {
  ShoppingBag,
  FileText,
  Flame,
  DollarSign,
  BarChart3,
  UserCheck,
  User as UserIcon,
  ChevronLeft,
  LogOut,
  Sun,
  Moon,
  Menu,
  X
} from 'lucide-react'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true'
  })
  const [mobileOpen, setMobileOpen] = useState(false)

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('enchiladitos_dark_mode') || localStorage.getItem('toffe_dark_mode')
    if (saved !== null) return saved === 'true'
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  const [userAvatars, setUserAvatars] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('enchiladitos_user_avatars') || localStorage.getItem('toffe_user_avatars') || '{}')
    } catch (e) {
      return {}
    }
  })

  useEffect(() => {
    localStorage.setItem('enchiladitos_dark_mode', String(isDarkMode))
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev)

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('sidebar_collapsed', String(next))
      return next
    })
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const rawAvatarUrl = user?.avatar_url || (user && user.id && userAvatars[user.id]) || ''
  const userAvatarUrl = processImageUrl(rawAvatarUrl)

  const navSections = [
    {
      title: 'OPERACIÓN & VENTAS',
      items: [
        { to: '/', label: 'Ventas (POS)', icon: ShoppingBag, end: true },
        { to: '/sales/history', label: 'Historial Ventas', icon: FileText },
        { to: '/customers', label: 'Clientes (CRM)', icon: UserCheck }
      ]
    },
    {
      title: 'CATÁLOGO & STOCK',
      items: [
        { to: '/products', label: 'Productos & Stock', icon: Flame }
      ]
    },
    {
      title: 'FINANZAS & CONTROL',
      items: [
        { to: '/accounting', label: 'Contabilidad', icon: DollarSign },
        { to: '/stats', label: 'Estadísticas', icon: BarChart3 }
      ]
    },
    {
      title: 'CUENTA',
      items: [
        { to: '/profile', label: 'Mi Perfil', icon: UserIcon }
      ]
    }
  ]

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#fff5f2] dark:bg-[#140505] text-[#450a0a] dark:text-[#fef2f2] transition-colors duration-200">
      {/* Mobile Top Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white dark:bg-[#1c0707] border-b border-red-200 dark:border-red-950/60 px-4 flex items-center justify-between z-40 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 rounded-xl text-[#450a0a] dark:text-[#fef2f2] hover:bg-red-100 dark:hover:bg-red-950/60 cursor-pointer"
            aria-label="Abrir menú"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="Enchiladitos Logo"
              className="w-8 h-8 rounded-xl object-contain border border-red-500/40 bg-black/20"
            />
            <div>
              <span className="font-black text-sm text-[#450a0a] dark:text-[#fef2f2] block leading-tight">
                ENCHILADITOS
              </span>
              <span className="text-[9px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                Sabor & Chamoy
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-xl text-red-600 dark:text-amber-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
        >
          {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-45"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 flex flex-col justify-between h-full bg-white dark:bg-[#1c0707] border-r border-red-200 dark:border-red-950/60 shadow-xs transition-all duration-300 z-50 select-none ${
          mobileOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-64 lg:min-w-[16rem]'}`}
      >
        <div className="flex-1 overflow-y-auto">
          {/* Header & Logo */}
          <div className="relative overflow-hidden p-4 border-b border-red-200/80 dark:border-red-950/60 bg-gradient-to-r from-red-50 to-amber-50 dark:from-[#240a0a] dark:to-[#1a0606]">
            <div className={`relative flex items-center ${isCollapsed ? 'justify-center w-full' : 'justify-between'} z-10`}>
              <button
                type="button"
                onClick={toggleCollapse}
                className="flex items-center gap-3 cursor-pointer group focus:outline-none"
                title={isCollapsed ? 'Desplegar menú' : 'Contraer menú'}
              >
                <img
                  src="/logo.png"
                  alt="Enchiladitos Logo"
                  className="w-10 h-10 rounded-2xl object-contain border border-red-500/50 bg-black/30 shadow-xs group-hover:scale-105 transition-transform shrink-0 p-0.5"
                />
                {!isCollapsed && (
                  <div className="flex flex-col min-w-0 text-left">
                    <span className="font-black text-lg text-[#450a0a] dark:text-[#fef2f2] tracking-tight leading-tight">
                      ENCHILADITOS
                    </span>
                    <span className="text-[9px] font-extrabold tracking-wider text-amber-600 dark:text-amber-400 uppercase leading-tight">
                      Sabor, Chamoy y Fuego
                    </span>
                  </div>
                )}
              </button>

              {/* Toggle Arrow Button in desktop */}
              {!isCollapsed && (
                <button
                  type="button"
                  onClick={toggleCollapse}
                  className="hidden lg:flex p-1.5 rounded-xl text-red-600/70 dark:text-amber-400/80 hover:text-red-700 dark:hover:text-amber-300 hover:bg-red-100 dark:hover:bg-red-950/60 transition-colors cursor-pointer"
                  title="Contraer menú"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}

              {/* Close in mobile */}
              <button
                onClick={() => setMobileOpen(false)}
                className="lg:hidden p-1.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/60 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-4">
            {navSections.map((section, sIdx) => (
              <div key={section.title} className="space-y-1">
                {!isCollapsed ? (
                  <span className="text-[10px] font-black text-red-600/80 dark:text-amber-500/90 uppercase tracking-wider px-3 pb-1 block">
                    {section.title}
                  </span>
                ) : (
                  sIdx > 0 && <div className="my-2 border-t border-red-200 dark:border-red-950" />
                )}

                {section.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 group relative ${
                          isActive
                            ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-xs'
                            : 'text-[#450a0a]/80 dark:text-[#fef2f2]/80 hover:text-red-600 dark:hover:text-amber-400 hover:bg-red-100/60 dark:hover:bg-red-950/40'
                        } ${isCollapsed ? 'lg:justify-center lg:px-0' : ''}`
                      }
                      title={isCollapsed ? item.label : undefined}
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${
                              isActive ? 'text-white' : 'text-red-500 dark:text-amber-400'
                            }`}
                          />
                          {!isCollapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
                        </>
                      )}
                    </NavLink>
                  )
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Dark Mode Switcher Section */}
        <div className="px-3 py-2 border-t border-red-200/60 dark:border-red-950/60 bg-red-50/40 dark:bg-[#140505]">
          {!isCollapsed ? (
            <div className="flex items-center justify-between p-2 rounded-2xl bg-white dark:bg-[#200808] border border-red-200 dark:border-red-950 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-1.5 rounded-xl transition-colors ${
                    isDarkMode ? 'bg-red-950 text-amber-400' : 'bg-red-100 text-red-600'
                  }`}
                >
                  {isDarkMode ? <Moon className="w-3.5 h-3.5 text-amber-400" /> : <Sun className="w-3.5 h-3.5 text-red-600" />}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-black text-[#450a0a] dark:text-[#fef2f2] leading-none">
                    {isDarkMode ? 'Modo Oscuro' : 'Modo Claro'}
                  </span>
                  <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 mt-0.5 leading-none">
                    Paleta Enchiladitos
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleDarkMode}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  isDarkMode ? 'bg-red-600' : 'bg-red-300'
                }`}
                title={isDarkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
              >
                <span
                  className={`pointer-events-none inline-flex items-center justify-center h-5 w-5 transform rounded-full bg-white dark:bg-[#fef2f2] shadow-lg transition duration-200 ${
                    isDarkMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                >
                  {isDarkMode ? <Moon className="w-2.5 h-2.5 text-red-600" /> : <Sun className="w-2.5 h-2.5 text-amber-600" />}
                </span>
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={toggleDarkMode}
                className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                  isDarkMode
                    ? 'bg-[#200808] border-red-950 text-amber-400 hover:bg-red-950/60'
                    : 'bg-white border-red-200 text-red-600 hover:bg-red-50'
                }`}
                title={isDarkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
              >
                {isDarkMode ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-red-600" />}
              </button>
            </div>
          )}
        </div>

        {/* Active User Footer */}
        <div className="p-3 border-t border-red-200 dark:border-red-950/60 bg-gradient-to-r from-red-50/70 to-amber-50/70 dark:from-[#1c0707] dark:to-[#140505]">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between gap-2'}`}>
            <div
              onClick={() => navigate('/profile')}
              className={`flex items-center gap-2.5 cursor-pointer group ${isCollapsed ? 'justify-center' : 'overflow-hidden text-left flex-1 min-w-0'}`}
              title="Ver mi perfil"
            >
              {userAvatarUrl ? (
                <img
                  src={userAvatarUrl}
                  alt={user?.username}
                  className="w-9 h-9 rounded-full object-cover border border-red-500/60 shrink-0 shadow-xs group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-600 to-amber-600 text-white font-black flex items-center justify-center text-sm shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  {user?.username ? user.username.charAt(0).toUpperCase() : 'D'}
                </div>
              )}

              {!isCollapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] truncate group-hover:text-red-600 transition-colors">
                    {user?.username || 'Dueño'}
                  </span>
                  <span className="inline-block mt-0.5">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-[#140505] text-red-600 dark:text-amber-400 border border-red-200 dark:border-red-900 uppercase tracking-wider">
                      ADMINISTRADOR
                    </span>
                  </span>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-950/60 transition-colors shrink-0 cursor-pointer"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Screen Content */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto pt-14 lg:pt-0 bg-[#fff5f2]/70 dark:bg-[#140505]">
        <div className="p-4 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </div>
      </main>
    </div>
  )
}