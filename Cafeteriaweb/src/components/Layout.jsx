import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true'
  })

  function handleLogout() {
    logout()
    navigate('/login')
  }

  function toggleCollapse() {
    setIsCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('sidebar_collapsed', next.toString())
      return next
    })
  }

  const isOwner = user?.role === 'owner'
  const isAdmin = user?.role === 'admin' || isOwner

  const roleLabels = {
    owner: 'Dueño',
    admin: 'Administrador',
    employee: 'Empleado'
  }

  return (
    <div className="app-shell">
      {/* Botón de toggle móvil */}
      <header className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Abrir menú"
          >
            ☰
          </button>
          <div className="mobile-brand-block">
            <span className="mobile-title">☕ Toffe</span>
            <span className="mobile-slogan">"Hecho por y para estudiantes"</span>
          </div>
        </div>
      </header>

      {/* Overlay para cerrar sidebar en móvil */}
      {mobileOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar Lateral */}
      <aside className={`app-sidebar ${mobileOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-logo-wrapper">
            <div className="brand-logo">☕</div>
            {!isCollapsed && (
              <div className="brand-text">
                <h1 className="brand-title">Toffe</h1>
                <span className="brand-subtitle">"Hecho por y para estudiantes"</span>
              </div>
            )}
          </div>
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={toggleCollapse}
            title={isCollapsed ? 'Expandir panel lateral' : 'Colapsar panel lateral'}
          >
            {isCollapsed ? '❯' : '❮'}
          </button>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
            title="Ventas (POS)"
          >
            <span className="nav-icon">🛒</span>
            {!isCollapsed && <span>Ventas (POS)</span>}
          </NavLink>

          <NavLink
            to="/sales/history"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
            title="Historial Ventas"
          >
            <span className="nav-icon">📜</span>
            {!isCollapsed && <span>Historial Ventas</span>}
          </NavLink>

          <NavLink
            to="/comandas"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
            title="Comandas (Cocina)"
          >
            <span className="nav-icon">🛎️</span>
            {!isCollapsed && <span>Comandas (Cocina)</span>}
          </NavLink>

          <NavLink
            to="/inventory"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
            title="Inventario"
          >
            <span className="nav-icon">📦</span>
            {!isCollapsed && <span>Inventario</span>}
          </NavLink>

          <NavLink
            to="/products"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
            title="Productos"
          >
            <span className="nav-icon">☕</span>
            {!isCollapsed && <span>Productos</span>}
          </NavLink>

          {isAdmin && (
            <NavLink
              to="/accounting"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
              title="Contabilidad"
            >
              <span className="nav-icon">💰</span>
              {!isCollapsed && <span>Contabilidad</span>}
            </NavLink>
          )}

          {isOwner && (
            <NavLink
              to="/stats"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
              title="Estadísticas"
            >
              <span className="nav-icon">📊</span>
              {!isCollapsed && <span>Estadísticas</span>}
            </NavLink>
          )}

          <NavLink
            to="/tasks"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
            title="Tareas"
          >
            <span className="nav-icon">✅</span>
            {!isCollapsed && <span>Tareas</span>}
          </NavLink>

          {isOwner && (
            <NavLink
              to="/users"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
              title="Usuarios"
            >
              <span className="nav-icon">👥</span>
              {!isCollapsed && <span>Usuarios</span>}
            </NavLink>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="avatar">
              {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
            </div>
            {!isCollapsed && (
              <div className="user-info">
                <span className="username">{user?.username}</span>
                <span className={`role-badge role-${user?.role}`}>
                  {roleLabels[user?.role] || user?.role}
                </span>
              </div>
            )}
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Cerrar sesión">
            🚪 {!isCollapsed && 'Salir'}
          </button>
        </div>
      </aside>

      {/* Ámbito de Contenido Principal */}
      <main className={`app-main-content ${isCollapsed ? 'collapsed' : ''}`}>
        <Outlet />
      </main>
    </div>
  )
}