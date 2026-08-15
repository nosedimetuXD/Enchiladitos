import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  function handleLogout() {
    logout()
    navigate('/login')
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
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Abrir menú"
        >
          ☰
        </button>
        <span className="mobile-title">☕ Toffe</span>
      </header>

      {/* Overlay para cerrar sidebar en móvil */}
      {mobileOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar Lateral */}
      <aside className={`app-sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-logo">☕</div>
          <div>
            <h1 className="brand-title">Toffe</h1>
            <span className="brand-subtitle">"Hecho por y para estudiantes"</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <span className="nav-icon">🛒</span>
            <span>Ventas (POS)</span>
          </NavLink>

          <NavLink
            to="/sales/history"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <span className="nav-icon">📜</span>
            <span>Historial Ventas</span>
          </NavLink>

          <NavLink
            to="/comandas"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <span className="nav-icon">🛎️</span>
            <span>Comandas (Cocina)</span>
          </NavLink>

          <NavLink
            to="/inventory"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <span className="nav-icon">📦</span>
            <span>Inventario</span>
          </NavLink>

          <NavLink
            to="/products"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <span className="nav-icon">☕</span>
            <span>Productos</span>
          </NavLink>

          {isAdmin && (
            <NavLink
              to="/accounting"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <span className="nav-icon">💰</span>
              <span>Contabilidad</span>
            </NavLink>
          )}

          <NavLink
            to="/tasks"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <span className="nav-icon">✅</span>
            <span>Tareas</span>
          </NavLink>

          {isOwner && (
            <NavLink
              to="/users"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <span className="nav-icon">👥</span>
              <span>Usuarios</span>
            </NavLink>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="avatar">
              {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="user-info">
              <span className="username">{user?.username}</span>
              <span className={`role-badge role-${user?.role}`}>
                {roleLabels[user?.role] || user?.role}
              </span>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Cerrar sesión">
            🚪 Salir
          </button>
        </div>
      </aside>

      {/* Ámbito de Contenido Principal */}
      <main className="app-main-content">
        <Outlet />
      </main>
    </div>
  )
}