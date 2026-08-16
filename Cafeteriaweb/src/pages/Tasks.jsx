import { useEffect, useState, useCallback } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useEvents } from '../hooks/useEvents'
import Modal from '../components/Modal'

const STATUS_LABELS = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  done: 'Completada'
}

export default function Tasks() {
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal Nueva Tarea
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [creating, setCreating] = useState(false)

  const { user } = useAuth()
  const canManage = user?.role === 'owner' || user?.role === 'admin'

  async function loadData() {
    try {
      const [tasksData, usersData] = await Promise.all([
        api.get('/tasks'),
        api.get('/users')
      ])
      setTasks(tasksData || [])
      setUsers(usersData || [])
    } catch (err) {
      setError('No se pudieron cargar las tareas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleTaskEvent = useCallback(() => {
    loadData()
  }, [])

  useEvents(['task_created', 'task_status_updated'], handleTaskEvent)

  async function handleCreate(e) {
    e.preventDefault()
    setCreating(true)
    setError('')

    try {
      await api.post('/tasks', {
        title,
        description,
        due_date: dueDate || null,
        assigned_to: assignedTo || null
      })
      setTitle('')
      setDescription('')
      setDueDate('')
      setAssignedTo('')
      setIsModalOpen(false)
      await loadData()
    } catch (err) {
      setError(err.message || 'No se pudo crear la tarea')
    } finally {
      setCreating(false)
    }
  }

  async function handleStatusChange(taskId, status) {
    try {
      await api.patch(`/tasks/${taskId}/status`, { status })
      await loadData()
    } catch (err) {
      setError('No se pudo actualizar el estado')
    }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta tarea?')) return

    try {
      await api.delete(`/tasks/${id}`)
      await loadData()
    } catch (err) {
      setError('No se pudo eliminar la tarea')
    }
  }

  if (loading) return <p>Cargando tareas...</p>

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Gestión de Tareas</h2>
          <p className="page-subtitle">Asignación y seguimiento de pendientes de la cafetería</p>
        </div>
        {canManage && (
          <button onClick={() => setIsModalOpen(true)}>
            + Nueva Tarea
          </button>
        )}
      </div>

      {error && <p className="error-text" style={{ marginBottom: '1rem' }}>{error}</p>}

      {/* Tabla de Tareas */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Descripción</th>
              <th>Fecha Límite</th>
              <th>Asignado a</th>
              <th>Estado</th>
              {canManage && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id}>
                <td style={{ fontWeight: 600 }}>{t.title}</td>
                <td>{t.description || '—'}</td>
                <td>{t.due_date ? new Date(t.due_date).toLocaleDateString() : '—'}</td>
                <td>{users.find((u) => u.id === t.assigned_to)?.username || 'Sin asignar'}</td>
                <td>
                  <select
                    value={t.status}
                    onChange={(e) => handleStatusChange(t.id, e.target.value)}
                    style={{ padding: '0.3rem 0.5rem', fontSize: '0.85rem' }}
                  >
                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </td>
                {canManage && (
                  <td>
                    <button className="danger" onClick={() => handleDelete(t.id)} style={{ padding: '0.35rem 0.65rem', fontSize: '0.82rem' }}>
                      Eliminar
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={canManage ? 6 : 5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  No hay tareas registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Nueva Tarea */}
      {canManage && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nueva Tarea">
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label>Título de la Tarea</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Limpieza profunda de molino de café"
                required
              />
            </div>

            <div className="form-group">
              <label>Descripción</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalles adicionales de la tarea"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Fecha Límite (Opcional)</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Asignar a</label>
                <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                  <option value="">Sin asignar</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button type="button" className="secondary" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </button>
              <button type="submit" disabled={creating}>
                {creating ? 'Creando...' : 'Crear Tarea'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}