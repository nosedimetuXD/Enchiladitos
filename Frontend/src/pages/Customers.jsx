import { useState, useEffect } from 'react'
import { api } from '../api/client'
import Modal from '../components/Modal'
import {
  Users,
  Search,
  UserPlus,
  Edit2,
  Trash2,
  Phone,
  Mail,
  FileText,
  AlertCircle,
  CheckCircle2,
  MessageCircle,
  UserCheck,
  Calendar
} from 'lucide-react'

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Modal Crear / Editar
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    notes: ''
  })
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState('')

  // Modal Confirmar Eliminar
  const [customerToDelete, setCustomerToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  async function loadCustomers(search = '') {
    try {
      const url = search ? `/customers?search=${encodeURIComponent(search)}` : '/customers'
      const data = await api.get(url)
      setCustomers(data || [])
    } catch (err) {
      setError(err.message || 'Error al cargar el listado de clientes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCustomers(searchQuery)
  }, [searchQuery])

  function handleOpenCreate() {
    setEditingCustomer(null)
    setFormData({
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      notes: ''
    })
    setModalError('')
    setIsModalOpen(true)
  }

  function handleOpenEdit(customer) {
    setEditingCustomer(customer)
    setFormData({
      first_name: customer.first_name || '',
      last_name: customer.last_name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      notes: customer.notes || ''
    })
    setModalError('')
    setIsModalOpen(true)
  }

  async function handleSaveCustomer(e) {
    e.preventDefault()
    setModalError('')
    setSaving(true)

    if (!formData.first_name.trim()) {
      setModalError('El nombre del cliente es obligatorio.')
      setSaving(false)
      return
    }

    try {
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, formData)
        setSuccessMessage('¡Cliente actualizado exitosamente!')
      } else {
        await api.post('/customers', formData)
        setSuccessMessage('¡Cliente registrado exitosamente!')
      }

      setIsModalOpen(false)
      await loadCustomers(searchQuery)
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setModalError(err.message || 'Error al guardar cliente')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteCustomer() {
    if (!customerToDelete) return
    setDeleting(true)
    try {
      await api.delete(`/customers/${customerToDelete.id}`)
      setSuccessMessage('Cliente eliminado del sistema')
      setCustomerToDelete(null)
      await loadCustomers(searchQuery)
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setError(err.message || 'Error al eliminar cliente')
    } finally {
      setDeleting(false)
    }
  }

  function getCleanPhone(phone) {
    if (!phone) return ''
    return phone.replace(/[^0-9]/g, '')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#1c0707] p-6 rounded-3xl border border-red-200 dark:border-red-950/60 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#450a0a] dark:text-[#fef2f2] tracking-tight">
                Gestión de Clientes
              </h1>
              <p className="text-xs font-bold text-red-600 dark:text-red-400">
                Directorio y registro de clientes para ventas y fidelización
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-extrabold text-xs shadow-md hover:shadow-lg transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Registrar Nuevo Cliente</span>
        </button>
      </div>

      {/* Alertas */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Buscador & Métricas */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#1c0707] p-4 rounded-3xl border border-red-200 dark:border-red-950/60 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-red-500" />
          <input
            type="text"
            placeholder="Buscar por nombre, apellido, teléfono o correo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#fff5f2] dark:bg-[#140505] border border-red-200 dark:border-red-950 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200/60 dark:border-red-900/40">
          <UserCheck className="w-4 h-4 text-red-600 dark:text-red-400" />
          <span className="text-xs font-black text-[#450a0a] dark:text-[#fef2f2]">
            Total Clientes: {customers.length}
          </span>
        </div>
      </div>

      {/* Lista / Grid de Clientes */}
      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-red-600">
          Cargando clientes...
        </div>
      ) : customers.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#1c0707] rounded-3xl border border-red-200 dark:border-red-950/60 space-y-3">
          <Users className="w-12 h-12 mx-auto text-red-300 dark:text-red-900" />
          <h3 className="text-base font-extrabold text-[#450a0a] dark:text-[#fef2f2]">
            {searchQuery ? 'No se encontraron clientes para la búsqueda' : 'Aún no hay clientes registrados'}
          </h3>
          <p className="text-xs text-red-600/80 dark:text-red-400/80 max-w-sm mx-auto">
            Registra a tus clientes frecuentes para llevar un mejor control y seleccionarlos rápido en caja.
          </p>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>Crear Primer Cliente</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {customers.map((c) => {
            const cleanPhone = getCleanPhone(c.phone)
            const fullName = `${c.first_name} ${c.last_name}`.trim()

            return (
              <div
                key={c.id}
                className="bg-white dark:bg-[#1c0707] border border-red-200 dark:border-red-950/60 hover:border-red-400 dark:hover:border-red-700 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500 to-amber-500 text-white font-black flex items-center justify-center text-sm shadow-xs">
                        {c.first_name ? c.first_name.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-[#450a0a] dark:text-[#fef2f2] group-hover:text-red-600 transition-colors">
                          {fullName}
                        </h3>
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Reg: {new Date(c.created_at).toLocaleDateString('es-CO')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="p-1.5 rounded-xl text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer"
                        title="Editar cliente"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setCustomerToDelete(c)}
                        className="p-1.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                        title="Eliminar cliente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Datos de Contacto */}
                  <div className="space-y-2 text-xs font-semibold">
                    {c.phone ? (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-[#fff5f2] dark:bg-[#140505] border border-red-100 dark:border-red-950">
                        <div className="flex items-center gap-2 text-[#450a0a] dark:text-[#fef2f2]">
                          <Phone className="w-3.5 h-3.5 text-red-500" />
                          <span>{c.phone}</span>
                        </div>
                        {cleanPhone && (
                          <a
                            href={`https://wa.me/${cleanPhone.length === 10 ? '57' + cleanPhone : cleanPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold shadow-xs transition-colors"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="text-[11px] text-red-400 italic">Sin teléfono registrado</div>
                    )}

                    {c.email && (
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-[#fff5f2] dark:bg-[#140505] border border-red-100 dark:border-red-950 text-[#450a0a] dark:text-[#fef2f2] truncate">
                        <Mail className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span className="truncate">{c.email}</span>
                      </div>
                    )}

                    {c.notes && (
                      <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 text-[11px] text-amber-900 dark:text-amber-200">
                        <div className="flex items-center gap-1 font-bold text-amber-700 dark:text-amber-400 mb-0.5">
                          <FileText className="w-3 h-3" />
                          <span>Notas:</span>
                        </div>
                        <p className="line-clamp-2">{c.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Crear / Editar */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? 'Editar Información del Cliente' : 'Registrar Nuevo Cliente'}
      >
        <form onSubmit={handleSaveCustomer} className="space-y-4">
          {modalError && (
            <div className="p-3 rounded-2xl bg-red-50 text-red-700 border border-red-200 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{modalError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#450a0a] dark:text-red-300 uppercase tracking-wider mb-1">
                Nombres *
              </label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="Ej. Carlos"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#140505] border border-red-200 dark:border-red-950 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#450a0a] dark:text-red-300 uppercase tracking-wider mb-1">
                Apellidos
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="Ej. Gómez"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#140505] border border-red-200 dark:border-red-950 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#450a0a] dark:text-red-300 uppercase tracking-wider mb-1">
                Número de Teléfono / WhatsApp
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Ej. 3001234567"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#140505] border border-red-200 dark:border-red-950 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#450a0a] dark:text-red-300 uppercase tracking-wider mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="cliente@ejemplo.com"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#140505] border border-red-200 dark:border-red-950 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#450a0a] dark:text-red-300 uppercase tracking-wider mb-1">
              Notas / Preferencias (Opcional)
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Ej. Le gusta extra chamoy, cliente frecuente de gomitas..."
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#140505] border border-red-200 dark:border-red-950 text-xs font-medium text-[#450a0a] dark:text-[#fef2f2] focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 rounded-2xl border border-red-200 dark:border-red-950 text-xs font-bold text-[#450a0a] dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-extrabold text-xs shadow-md disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Guardando...' : editingCustomer ? 'Actualizar Cliente' : 'Guardar Cliente'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmar Eliminar */}
      <Modal
        isOpen={!!customerToDelete}
        onClose={() => setCustomerToDelete(null)}
        title="Confirmar Eliminación"
      >
        <div className="space-y-4">
          <p className="text-xs font-bold text-[#450a0a] dark:text-[#fef2f2]">
            ¿Estás seguro de que deseas eliminar al cliente{' '}
            <span className="text-red-600 underline">
              {customerToDelete?.first_name} {customerToDelete?.last_name}
            </span>
            ?
          </p>
          <p className="text-[11px] text-red-500">
            Esta acción eliminará la ficha del cliente en la base de datos.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCustomerToDelete(null)}
              className="px-4 py-2 rounded-2xl border border-red-200 text-xs font-bold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDeleteCustomer}
              disabled={deleting}
              className="px-4 py-2 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-md cursor-pointer disabled:opacity-50"
            >
              {deleting ? 'Eliminando...' : 'Sí, Eliminar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
