import { useEffect, useState } from 'react'
import { api, API_URL } from '../api/client'
import Modal from '../components/Modal'
import { CheckSquare, Plus, CheckCircle2, User, AlertTriangle, Flame } from 'lucide-react'

export default function Tasks() {
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [selectedShift, setSelectedShift] = useState('Todos')
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')

  // Modal Crear Tarea
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  async function loadData() {
    try {
      const [tasksData, usersData] = await Promise.all([
        api.get('/tasks'),
        api.get('/users')
      ])
      setTasks(tasksData || [])
      setUsers(usersData || [])
    } catch (err) {
      setPageError('No se pudieron cargar las tareas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()

    // Conexión SSE en tiempo real
    const eventSource = new EventSource(`${API_URL}/events`)
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'task_created' || data.type === 'task_status_updated') {
          loadData()
        }
      } catch (e) {}
    }

    return () => {
      eventSource.close()
    }
  }, [])

  function openCreateModal() {
    setTitle('')
    setDescription('')
    setAssignedTo('')
    setFormError('')
    setIsModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')

    try {
      await api.post('/tasks', {
        title,
        description,
        assigned_to: assignedTo || null
      })
      setIsModalOpen(false)
      await loadData()
    } catch (err) {
      setFormError(err.message || 'No se pudo crear la tarea')
    } finally {
      setSubmitting(false)
    }
  }

  function isTaskCompleted(t) {
    return Boolean(t.completed || t.status === 'completado' || t.status === 'completada')
  }

  async function toggleTaskStatus(t) {
    const currentCompleted = isTaskCompleted(t)
    const newStatus = currentCompleted ? 'pendiente' : 'completada'

    try {
      await api.patch(`/tasks/${t.id}/status`, {
        status: newStatus,
        completed: !currentCompleted
      })
      await loadData()
    } catch (err) {
      alert('Error al actualizar el estado de la tarea')
    }
  }

  const filteredTasks = tasks.filter((t) => {
    const isDone = isTaskCompleted(t)
    if (selectedShift === 'Pendientes') return !isDone
    if (selectedShift === 'Completadas') return isDone
    return true
  })

  const completedCount = tasks.filter((t) => isTaskCompleted(t)).length
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0

  if (loading) return <p className="p-4 text-sm font-semibold text-red-600">Cargando tareas operativas...</p>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#450a0a] dark:text-[#fef2f2] tracking-tight">
            Tareas Operativas & Checklist Diario
          </h2>
          <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-0.5">
            Asignación y seguimiento de actividades del equipo en Enchiladitos
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Nueva Tarea
        </button>
      </div>

      {pageError && (
        <div className="p-3.5 rounded-2xl bg-red-50 text-red-700 border border-red-200 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span>{pageError}</span>
        </div>
      )}

      {/* Barra de Progreso Operativo */}
      <div className="bg-[#FFFFFF] dark:bg-[#1c0707] border border-red-200 dark:border-red-950/60 rounded-3xl p-5 shadow-xs">
        <div className="flex items-center justify-between text-xs font-black text-[#450a0a] dark:text-[#fef2f2] mb-2">
          <span className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-red-600" />
            Progreso Operativo del Día
          </span>
          <span className="text-red-600 font-mono">
            {completedCount} de {tasks.length} completadas ({progressPercent}%)
          </span>
        </div>
        <div className="h-3 w-full bg-red-50 dark:bg-[#140505] rounded-full overflow-hidden border border-red-200 dark:border-red-950">
          <div
            className="h-full bg-gradient-to-r from-red-600 to-amber-600 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2">
        {['Todos', 'Pendientes', 'Completadas'].map((filter) => (
          <button
            key={filter}
            onClick={() => setSelectedShift(filter)}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer ${
              selectedShift === filter
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-xs'
                : 'bg-white dark:bg-[#1c0707] border border-red-200 text-[#450a0a] dark:text-[#fef2f2]'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Lista de Tareas */}
      <div className="space-y-3">
        {filteredTasks.map((t) => {
          const isDone = isTaskCompleted(t)
          return (
            <div
              key={t.id}
              onClick={() => toggleTaskStatus(t)}
              className={`p-4 rounded-3xl border transition-all cursor-pointer flex items-start justify-between gap-4 shadow-xs select-none ${
                isDone
                  ? 'bg-red-50/30 dark:bg-[#240a0a]/30 border-red-100 dark:border-red-950 opacity-75'
                  : 'bg-white dark:bg-[#1c0707] border-red-200 dark:border-red-950/60 hover:border-red-500'
              }`}
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div
                  className={`w-6 h-6 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border transition-colors ${
                    isDone
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-white dark:bg-[#140505] border-red-200 text-transparent'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 fill-current" />
                </div>

                <div>
                  <h4 className={`text-sm font-black tracking-tight ${isDone ? 'line-through text-amber-700/60 dark:text-amber-400/60' : 'text-[#450a0a] dark:text-[#fef2f2]'}`}>
                    {t.title}
                  </h4>
                  {t.description && (
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 font-semibold">{t.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 mt-2.5 text-[10px] text-amber-700 dark:text-amber-400 font-bold">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-red-500" />
                      Asignada a: <strong className="text-[#450a0a] dark:text-[#fef2f2]">{t.assigned_to_name || t.assigned_to_username || 'Todo el Equipo'}</strong>
                    </span>
                    <span>• Creada por: <strong className="text-[#450a0a] dark:text-[#fef2f2]">{t.created_by_name || t.creator_username || 'Administrador'}</strong></span>
                  </div>
                </div>
              </div>

              {isDone && (
                <span className="text-[10px] text-emerald-600 font-black shrink-0">
                  ✓ Completada
                </span>
              )}
            </div>
          )
        })}

        {filteredTasks.length === 0 && (
          <div className="p-8 text-center bg-white dark:bg-[#1c0707] border border-red-200 dark:border-red-950/60 rounded-3xl text-xs text-red-400 font-bold">
            No hay tareas en esta sección.
          </div>
        )}
      </div>

      {/* Modal Crear Tarea */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nueva Tarea Operativa">
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3.5 rounded-2xl bg-red-50 text-red-700 border border-red-200 text-xs font-bold">
              ⚠️ {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-black text-[#450a0a] dark:text-amber-300 uppercase tracking-wider mb-1">
              Título de la Tarea
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Rellenar dispensadores de Tajín y Chamoy"
              required
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#140505] border border-red-200 dark:border-red-950 text-sm font-bold text-[#450a0a] dark:text-[#fef2f2]"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-[#450a0a] dark:text-amber-300 uppercase tracking-wider mb-1">
              Descripción / Instrucciones (Opcional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles sobre cómo realizar la tarea o precauciones..."
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#140505] border border-red-200 dark:border-red-950 text-sm font-semibold text-[#450a0a] dark:text-[#fef2f2]"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-[#450a0a] dark:text-amber-300 uppercase tracking-wider mb-1">
              Asignar a
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#140505] border border-red-200 dark:border-red-950 text-sm font-bold text-[#450a0a] dark:text-[#fef2f2]"
            >
              <option value="">Todo el Equipo / General</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 justify-end pt-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 rounded-2xl bg-white dark:bg-[#1c0707] border border-red-200 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white text-xs font-black shadow-md cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Creando...' : 'Crear Tarea'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}