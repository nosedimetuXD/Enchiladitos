import { useState, useEffect, useMemo } from 'react'
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
  MessageCircle,
  UserCheck,
  Calendar,
  Download,
  ShoppingBag,
  Clock,
  Sparkles,
  Tag,
  DollarSign
} from 'lucide-react'

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [sales, setSales] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  // Modal Ficha 360 / Timeline del Cliente (Inspirado en Twenty)
  const [selectedCustomer360, setSelectedCustomer360] = useState(null)
  const [is360ModalOpen, setIs360ModalOpen] = useState(false)

  // Modal Plantillas WhatsApp
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false)
  const [whatsAppCustomer, setWhatsAppCustomer] = useState(null)

  async function loadData(search = '') {
    try {
      const url = search ? `/customers?search=${encodeURIComponent(search)}` : '/customers'
      const [custData, salesData] = await Promise.all([
        api.get(url),
        api.get('/sales?period=all').catch(() => [])
      ])
      setCustomers(custData || [])
      setSales(salesData || [])
    } catch (err) {
      setError(err.message || 'Error al cargar los clientes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData(searchQuery)
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
      } else {
        await api.post('/customers', formData)
      }
      setIsModalOpen(false)
      await loadData(searchQuery)
    } catch (err) {
      setModalError(err.message || 'Error al guardar cliente')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteCustomer(customer) {
    if (!window.confirm(`¿Estás seguro de eliminar a ${customer.first_name} ${customer.last_name || ''}?`)) return
    try {
      await api.delete(`/customers/${customer.id}`)
      setCustomers((prev) => prev.filter((c) => c.id !== customer.id))
    } catch (err) {
      alert(err.message || 'Error al eliminar cliente')
    }
  }

  function openCustomer360(customer) {
    setSelectedCustomer360(customer)
    setIs360ModalOpen(true)
  }

  function openWhatsAppTemplates(customer) {
    setWhatsAppCustomer(customer)
    setIsWhatsAppModalOpen(true)
  }

  function sendWhatsAppMessage(templateType) {
    if (!whatsAppCustomer) return
    const phone = (whatsAppCustomer.phone || '').replace(/\D/g, '')
    const name = whatsAppCustomer.first_name

    let msg = ''
    if (templateType === 'greeting') {
      msg = `¡Hola ${name}! 🌶️ Te escribimos de *Enchiladitos*. Queremos agradecerte por ser parte de nuestra comunidad de sabor y chamoy. ¿Se te antoja algo delicioso para hoy?`
    } else if (templateType === 'promo') {
      msg = `¡Hola ${name}! 🔥 En *Enchiladitos* tenemos una promoción especial para ti: 10% de descuento en tu próximo pedido de Gomitas o Sparkies escarchados. ¡Haz tu pedido respondiendo a este mensaje!`
    } else if (templateType === 'new_flavors') {
      msg = `¡Hola ${name}! 🍓✨ Acabamos de preparar un nuevo lote con el chamoy más fresco y picante de *Enchiladitos*. ¡No te quedes sin el tuyo!`
    }

    const url = phone
      ? `https://wa.me/${phone.startsWith('57') ? phone : '57' + phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`

    window.open(url, '_blank')
    setIsWhatsAppModalOpen(false)
  }

  // Compras de cada cliente asociadas
  const customerStatsMap = useMemo(() => {
    const map = {}
    sales.forEach((s) => {
      const cName = (s.customer_name || '').trim().toLowerCase()
      if (!cName || cName === 'cliente general') return
      if (!map[cName]) {
        map[cName] = { totalSpent: 0, ordersCount: 0, salesList: [] }
      }
      map[cName].totalSpent += s.total || 0
      map[cName].ordersCount += 1
      map[cName].salesList.push(s)
    })
    return map
  }, [sales])

  // Exportar a CSV (Inspirado en Twenty CRM)
  function exportCustomersCSV() {
    let csv = 'Nombre,Apellido,Telefono,Email,Notas,TotalGastado,Pedidos\n'
    customers.forEach((c) => {
      const key = `${c.first_name} ${c.last_name || ''}`.trim().toLowerCase()
      const stats = customerStatsMap[key] || { totalSpent: 0, ordersCount: 0 }
      csv += `"${c.first_name}","${c.last_name || ''}","${c.phone || ''}","${c.email || ''}","${c.notes || ''}",${stats.totalSpent},${stats.ordersCount}\n`
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `Clientes_Enchiladitos_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#1c0707] p-6 rounded-3xl border border-red-200/80 dark:border-red-950/60 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-red-100 dark:bg-red-950 text-red-600 dark:text-amber-400">
              <UserCheck className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-[#450a0a] dark:text-[#fef2f2]">
              Directorio de Clientes (CRM)
            </h1>
          </div>
          <p className="text-sm font-medium text-red-900/60 dark:text-red-300/60 mt-1">
            Ficha 360°, historial de compras, notas de preferencias y contacto directo por WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCustomersCSV}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white dark:bg-[#200808] border border-red-200 dark:border-red-950 text-red-700 dark:text-amber-400 font-bold text-xs hover:bg-red-50 cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-black text-xs shadow-md cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nuevo Cliente</span>
          </button>
        </div>
      </div>

      {/* Buscador */}
      <div className="bg-white dark:bg-[#1c0707] p-4 rounded-3xl border border-red-200/70 dark:border-red-950/60 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-red-900/40 dark:text-red-400/40" />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono, correo o notas de preferencia..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
      </div>

      {/* Grid / Listado de Clientes */}
      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-600 border-t-transparent"></div>
          <p className="text-xs font-bold text-red-900/60 dark:text-red-400/60 mt-3">Cargando clientes...</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#1c0707] rounded-3xl border border-dashed border-red-200 dark:border-red-950 p-8">
          <Users className="w-12 h-12 mx-auto text-red-400/40 mb-3" />
          <p className="text-base font-black text-[#450a0a] dark:text-[#fef2f2]">No se encontraron clientes</p>
          <p className="text-xs font-medium text-red-900/50 dark:text-red-400/50 mt-1">
            Comienza registrando a tus clientes para llevar un historial de sus pedidos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((c) => {
            const key = `${c.first_name} ${c.last_name || ''}`.trim().toLowerCase()
            const stats = customerStatsMap[key] || { totalSpent: 0, ordersCount: 0 }
            const isVIP = stats.ordersCount >= 3 || stats.totalSpent >= 30000

            return (
              <div
                key={c.id}
                className="flex flex-col justify-between bg-white dark:bg-[#1c0707] rounded-3xl border border-red-200/80 dark:border-red-950/60 p-5 shadow-xs hover:shadow-md transition-all space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-600 to-amber-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                        {c.first_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-black text-sm text-[#450a0a] dark:text-[#fef2f2] truncate">
                          {c.first_name} {c.last_name || ''}
                        </h3>
                        {isVIP && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-amber-600 dark:text-amber-400">
                            <Sparkles className="w-2.5 h-2.5" /> Cliente VIP
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openWhatsAppTemplates(c)}
                        className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors cursor-pointer"
                        title="Plantillas WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="p-2 rounded-xl text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCustomer(c)}
                        className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Datos de Contacto */}
                  <div className="mt-3 space-y-1.5 text-xs text-red-950/70 dark:text-red-200/70">
                    {c.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-red-500" />
                        <span className="font-bold">{c.phone}</span>
                      </div>
                    )}
                    {c.email && (
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-red-500" />
                        <span className="font-medium truncate">{c.email}</span>
                      </div>
                    )}
                    {c.notes && (
                      <div className="p-2.5 rounded-xl bg-red-50/50 dark:bg-[#200808] border border-red-200/60 dark:border-red-950 text-[11px] text-[#450a0a] dark:text-[#fef2f2] italic">
                        "{c.notes}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Métricas y Ficha 360 */}
                <div className="pt-3 border-t border-red-100 dark:border-red-950 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Inversión Total</span>
                    <p className="text-sm font-black text-red-600 dark:text-amber-400">
                      ${stats.totalSpent.toLocaleString('es-CO')}
                    </p>
                  </div>

                  <button
                    onClick={() => openCustomer360(c)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-100 dark:bg-red-950 text-red-700 dark:text-amber-400 font-bold text-xs hover:bg-red-200 transition-colors cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Ver Pedidos ({stats.ordersCount})</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Ficha 360 / Timeline de Compras */}
      <Modal
        isOpen={is360ModalOpen}
        onClose={() => setIs360ModalOpen(false)}
        title={`Ficha del Cliente: ${selectedCustomer360?.first_name || ''} ${selectedCustomer360?.last_name || ''}`}
      >
        {selectedCustomer360 && (
          <div className="space-y-4">
            {/* Resumen */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-[#200808] border border-red-200 text-center">
                <span className="text-[10px] font-bold uppercase text-gray-500">Total Comprado</span>
                <p className="text-xl font-black text-red-600 dark:text-amber-400">
                  $
                  {(
                    customerStatsMap[`${selectedCustomer360.first_name} ${selectedCustomer360.last_name || ''}`.trim().toLowerCase()]?.totalSpent || 0
                  ).toLocaleString('es-CO')}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-[#200808] border border-amber-200 text-center">
                <span className="text-[10px] font-bold uppercase text-gray-500">Total de Pedidos</span>
                <p className="text-xl font-black text-amber-600 dark:text-amber-400">
                  {customerStatsMap[`${selectedCustomer360.first_name} ${selectedCustomer360.last_name || ''}`.trim().toLowerCase()]?.ordersCount || 0}{' '}
                  ventas
                </p>
              </div>
            </div>

            {/* Timeline de Pedidos */}
            <div>
              <h4 className="text-xs font-black uppercase text-red-950 dark:text-red-200 mb-2">
                Historial de Compras
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {(
                  customerStatsMap[`${selectedCustomer360.first_name} ${selectedCustomer360.last_name || ''}`.trim().toLowerCase()]?.salesList || []
                ).length === 0 ? (
                  <p className="text-xs text-gray-500 italic py-4 text-center">
                    Aún no hay compras registradas a nombre de este cliente.
                  </p>
                ) : (
                  (
                    customerStatsMap[`${selectedCustomer360.first_name} ${selectedCustomer360.last_name || ''}`.trim().toLowerCase()]?.salesList || []
                  ).map((s) => (
                    <div
                      key={s.id}
                      className="p-3 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200/60 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-red-500" />
                          <span className="font-bold">
                            {new Date(s.created_at).toLocaleString('es-CO', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-600 mt-1">
                          {(s.items || []).map((it) => `${it.quantity}x ${it.product_name}`).join(', ')}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-black text-red-600 dark:text-amber-400 text-sm">
                          ${s.total.toLocaleString('es-CO')}
                        </span>
                        <p className="text-[10px] uppercase text-gray-500">{s.payment_method}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-red-100 dark:border-red-950">
              <button
                onClick={() => setIs360ModalOpen(false)}
                className="px-5 py-2 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Plantillas Rápidas WhatsApp */}
      <Modal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        title={`Mensajes WhatsApp para ${whatsAppCustomer?.first_name || ''}`}
      >
        <div className="space-y-3">
          <p className="text-xs text-gray-600 dark:text-gray-300">
            Selecciona una plantilla para abrir WhatsApp con el mensaje pre-cargado:
          </p>

          <button
            onClick={() => sendWhatsAppMessage('greeting')}
            className="w-full text-left p-3.5 rounded-2xl bg-emerald-50 dark:bg-[#1a0f0f] border border-emerald-200 dark:border-emerald-950 hover:bg-emerald-100/70 transition-colors cursor-pointer"
          >
            <h5 className="font-black text-xs text-emerald-800 dark:text-emerald-300">👋 Saludo & Fidelización</h5>
            <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1">
              "¡Hola! Te escribimos de Enchiladitos para agradecerte tu preferencia..."
            </p>
          </button>

          <button
            onClick={() => sendWhatsAppMessage('promo')}
            className="w-full text-left p-3.5 rounded-2xl bg-amber-50 dark:bg-[#1a0f0f] border border-amber-200 dark:border-amber-950 hover:bg-amber-100/70 transition-colors cursor-pointer"
          >
            <h5 className="font-black text-xs text-amber-800 dark:text-amber-300">🎁 Cupón de Descuento 10%</h5>
            <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1">
              "¡Hola! Tienes un 10% de descuento en tu próximo pedido de gomitas..."
            </p>
          </button>

          <button
            onClick={() => sendWhatsAppMessage('new_flavors')}
            className="w-full text-left p-3.5 rounded-2xl bg-red-50 dark:bg-[#1a0f0f] border border-red-200 dark:border-red-950 hover:bg-red-100/70 transition-colors cursor-pointer"
          >
            <h5 className="font-black text-xs text-red-800 dark:text-red-300">🔥 Aviso de Nuevo Lote de Productos</h5>
            <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1">
              "¡Hola! Acabamos de preparar un nuevo lote con el chamoy más fresco..."
            </p>
          </button>
        </div>
      </Modal>

      {/* Modal Crear / Editar Cliente */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
      >
        <form onSubmit={handleSaveCustomer} className="space-y-4">
          {modalError && (
            <div className="p-3 rounded-2xl bg-red-100 text-red-700 text-xs font-bold">{modalError}</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-red-950 dark:text-red-200 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="Ej. Juan"
                className="w-full px-4 py-2.5 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200 text-xs font-bold focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-red-950 dark:text-red-200 mb-1">
                Apellido
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="Ej. Pérez"
                className="w-full px-4 py-2.5 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200 text-xs font-bold focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-red-950 dark:text-red-200 mb-1">
                Teléfono / WhatsApp
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Ej. 3001234567"
                className="w-full px-4 py-2.5 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200 text-xs font-bold focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-red-950 dark:text-red-200 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="juan@ejemplo.com"
                className="w-full px-4 py-2.5 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200 text-xs font-bold focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-red-950 dark:text-red-200 mb-1">
              Notas & Preferencias (CRM)
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Ej. Le gusta con extra tajín, prefiere sparkies de mora..."
              className="w-full px-4 py-2 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200 text-xs font-bold focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-red-100 dark:border-red-950">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-5 py-2.5 rounded-2xl text-xs font-bold text-red-950/70 hover:bg-red-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 text-white font-black text-xs shadow-md cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Guardando...' : editingCustomer ? 'Actualizar Cliente' : 'Crear Cliente'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
