import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'

export default function Users() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal Crear / Editar Usuario
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('employee')
  const [submitting, setSubmitting] = useState(false)

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

  function openCreateModal() {
    setEditingUser(null)
    setUsername('')
    setPassword('')
    setRole('employee')
    setIsModalOpen(true)
  }

  function openEditModal(userItem) {
    setEditingUser(userItem)
    setUsername(userItem.username)
    setPassword('')
    setRole(userItem.role)
    setIsModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      if (editingUser) {
        // Editar usuario existente
        const updated = await api.put(`/users/${editingUser.id}`, {
          username,
          password: password ? password : undefined,
          role
        })

        // Si el dueño se editó a sí mismo, actualizar el localStorage para reflejar el nuevo nombre/rol en pantalla
        if (currentUser && currentUser.id === editingUser.id) {
          const updatedAuthUser = { ...currentUser, username: updated.username, role: updated.role }
          localStorage.setItem('user', JSON.stringify(updatedAuthUser))
        }
      } else {
        // Crear nuevo usuario
        await api.post('/users', { username, password, role })
      }

      setIsModalOpen(false)
      await loadUsers()
    } catch (err) {
      setError(
        err.message.includes('ya')
          ? 'Ese nombre de usuario ya está registrado'
          : err.message || 'No se pudo guardar el usuario'
      )
    } finally {
      setSubmitting(false)
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
        <button onClick={openCreateModal}>
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
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>
                  {u.username} {currentUser?.id === u.id && <span style={{ fontSize: '0.75rem', background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', marginLeft: '0.35rem' }}>(Tú)</span>}
                </td>
                <td>
                  <span className={`role-badge role-${u.role}`}>
                    {roleLabels[u.role] || u.role}
                  </span>
                </td>
                <td>{new Date(u.created_at).toLocaleDateString()}</td>
                <td>
                  <button
                    className="secondary"
                    onClick={() => openEditModal(u)}
                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.82rem' }}
                  >
                    ✏️ Editar
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  No hay usuarios registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Crear / Editar Usuario */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? `Editar Usuario: ${editingUser.username}` : 'Nuevo Usuario'}
      >
        <form onSubmit={handleSubmit}>
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
            <label>
              Contraseña {editingUser ? '(Opcional: Dejar en blanco para conservar la actual)' : '(Mínimo 8 caracteres)'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={editingUser ? '•••••••• (vacío para no cambiar)' : 'Escribe una contraseña segura'}
              required={!editingUser}
              minLength={password ? 8 : undefined}
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
            <button type="submit" disabled={submitting}>
              {submitting ? 'Guardando...' : editingUser ? 'Actualizar Usuario' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}