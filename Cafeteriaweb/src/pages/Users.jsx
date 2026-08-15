import { useEffect, useState } from 'react'
import { api } from '../api/client'
import Modal from '../components/Modal'

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal Nuevo Usuario
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('employee')
  const [creating, setCreating] = useState(false)

  async function loadUsers() {
    try {
      const data = await api.get('/users')
      setUsers(data || [])
    } catch (err) {
      setError('No se pudieron cargar los usuarios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    setCreating(true)
    setError('')

    try {
      await api.post('/users', { username, password, role })
      setUsername('')
      setPassword('')
      setRole('employee')
      setIsModalOpen(false)
      await loadUsers()
    } catch (err) {
      setError(err.message.includes('ya existe') ? 'Ese nombre de usuario ya existe' : 'No se pudo crear el usuario')
    } finally {
      setCreating(false)
    }
  }

  const roleLabels = {
    owner: '👑 Dueño',
    admin: '🛡️ Administrador',
    employee: '☕ Empleado'
  }

  if (loading) return <p>Cargando usuarios...</p>

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Gestión de Usuarios</h2>
          <p className="page-subtitle">Cuentas y roles del personal del sistema</p>
        </div>
        <button onClick={() => setIsModalOpen(true)}>
          + Nuevo Usuario
        </button>
      </div>

      {error && <p className="error-text" style={{ marginBottom: '1rem' }}>{error}</p>}

      {/* Tabla de Usuarios */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Rol asignado</th>
              <th>Fecha de Creación</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>{u.username}</td>
                <td>
                  <span className={`role-badge role-${u.role}`}>
                    {roleLabels[u.role] || u.role}
                  </span>
                </td>
                <td>{new Date(u.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  No hay usuarios registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Nuevo Usuario */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nuevo Usuario">
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label>Nombre de Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ej. carlos_barista"
              required
            />
          </div>

          <div className="form-group">
            <label>Contraseña (mínimo 8 caracteres)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          <div className="form-group">
            <label>Rol de Sistema</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="employee">☕ Empleado (Ventas, Comandas, Inventario lectura)</option>
              <option value="admin">🛡️ Administrador (Acceso completo salvo gestión usuarios)</option>
              <option value="owner">👑 Dueño (Control total del sistema)</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button type="button" className="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" disabled={creating}>
              {creating ? 'Creando...' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}