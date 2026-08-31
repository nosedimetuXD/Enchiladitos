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
  DollarSign,
  Coins,
  Wallet,
  Receipt,
  Send,
  Plus,
  BadgeAlert,
  CreditCard,
  Building2,
  CheckCircle2
} from 'lucide-react'

const COMMON_BANKS = ['Bre-B/Llave', 'Nequi', 'Daviplata', 'Bancolombia', 'Nu', 'Davivienda', 'BBVA', 'Banco de Bogotá']

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [sales, setSales] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [debtFilter, setDebtFilter] = useState('all') // 'all' | 'with_debt' | 'clean'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal Crear / Editar Cliente
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

  // Modal Ficha 360 & Estado de Cuenta
  const [selectedCustomer360, setSelectedCustomer360] = useState(null)
  const [accountSummary, setAccountSummary] = useState(null)
  const [loadingAccount, setLoadingAccount] = useState(false)
  const [is360ModalOpen, setIs360ModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('account') // 'account' | 'payments' | 'all_sales'

  // Modal Registrar Abono
  const [isAbonoModalOpen, setIsAbonoModalOpen] = useState(false)
  const [abonoAmount, setAbonoAmount] = useState('')
  const [abonoMethod, setAbonoMethod] = useState('efectivo')
  const [abonoBank, setAbonoBank] = useState('Bre-B/Llave')
  const [abonoNotes, setAbonoNotes] = useState('')
  const [abonoSubmitting, setAbonoSubmitting] = useState(false)
  const [abonoError, setAbonoError] = useState('')

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

  async function openCustomer360(customer) {
    setSelectedCustomer360(customer)
    setIs360ModalOpen(true)
    setActiveTab('account')
    setLoadingAccount(true)
    try {
      const acc = await api.get(`/customers/${customer.id}/account`)
      setAccountSummary(acc)
    } catch (err) {
      console.warn('Error cargando estado de cuenta', err)
    } finally {
      setLoadingAccount(false)
    }
  }

  async function refreshCustomerAccount(customerId) {
    try {
      const [acc, custData] = await Promise.all([
        api.get(`/customers/${customerId}/account`),
        api.get('/customers')
      ])
      setAccountSummary(acc)
      setCustomers(custData || [])
    } catch (err) {
      console.warn('Error refrescando estado de cuenta', err)
    }
  }

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

  // Manejo de Abonos
  function handleOpenAbono() {
    if (!selectedCustomer360) return
    const debt = accountSummary?.current_debt || selectedCustomer360.total_debt || 0
    setAbonoAmount(debt > 0 ? String(debt) : '')
    setAbonoMethod('efectivo')
    setAbonoBank('Bre-B/Llave')
    setAbonoNotes('')
    setAbonoError('')
    setIsAbonoModalOpen(true)
  }

  async function handleProcessAbono(e) {
    e.preventDefault()
    setAbonoSubmitting(true)
    setAbonoError('')

    const val = Number(abonoAmount) || 0
    if (val <= 0) {
      setAbonoError('Ingresa un monto válido mayor a $0')
      setAbonoSubmitting(false)
      return
    }

    try {
      const payload = {
        amount: val,
        payment_method: abonoMethod,
        bank_details: abonoMethod !== 'efectivo' ? abonoBank : '',
        notes: abonoNotes.trim()
      }

      await api.post(`/customers/${selectedCustomer360.id}/payments`, payload)
      setIsAbonoModalOpen(false)
      await refreshCustomerAccount(selectedCustomer360.id)
    } catch (err) {
      setAbonoError(err.message || 'Error registrando el abono')
    } finally {
      setAbonoSubmitting(false)
    }
  }

  function handleSendAccountWhatsApp() {
    if (!selectedCustomer360) return
    const phone = (selectedCustomer360.phone || '').replace(/\D/g, '')
    const name = `${selectedCustomer360.first_name} ${selectedCustomer360.last_name || ''}`.trim()
    const debt = accountSummary?.current_debt || 0

    let msg = `*ENCHILADITOS - ESTADO DE CUENTA*\n`
    msg += `¡Hola ${name}! Te compartimos el resumen de tu cuenta:\n\n`
    msg += `• *Total Compras:* $${Number(accountSummary?.total_sales || 0).toLocaleString('es-CO')}\n`
    msg += `• *Total Abonado/Pagado:* $${Number(accountSummary?.total_paid || 0).toLocaleString('es-CO')}\n`
    if (debt > 0) {
      msg += `• *SALDO PENDIENTE POR PAGAR:* $${Number(debt).toLocaleString('es-CO')}\n\n`
      msg += `Agradecemos tu pronto pago. Cualquier duda estamos atentos. ¡Muchas gracias!`
    } else {
      msg += `• *SALDO ACTUAL:* ¡Al día! ($0)\n\n`
      msg += `¡Muchas gracias por tu preferencia!`
    }

    const url = phone
      ? `https://wa.me/${phone.startsWith('57') ? phone : '57' + phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`

    window.open(url, '_blank')
  }

  function handleSendAbonoWhatsApp(payment) {
    if (!selectedCustomer360) return
    const phone = (selectedCustomer360.phone || '').replace(/\D/g, '')
    const name = `${selectedCustomer360.first_name} ${selectedCustomer360.last_name || ''}`.trim()
    const debt = accountSummary?.current_debt || 0

    let msg = `*ENCHILADITOS - COMPROBANTE DE ABONO*\n`
    msg += `¡Hola ${name}! Registramos tu abono con éxito:\n\n`
    msg += `• *Monto Abonado:* $${Number(payment.amount).toLocaleString('es-CO')}\n`
    msg += `• *Método:* ${payment.payment_method.toUpperCase()} ${payment.bank_details ? `(${payment.bank_details})` : ''}\n`
    msg += `• *Fecha:* ${new Date(payment.created_at).toLocaleString('es-CO')}\n`
    msg += `• *Saldo Pendiente Restante:* $${Number(debt).toLocaleString('es-CO')}\n\n`
    msg += `¡Muchas gracias por tu pago!`

    const url = phone
      ? `https://wa.me/${phone.startsWith('57') ? phone : '57' + phone}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`

    window.open(url, '_blank')
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
      msg = `¡Hola ${name}! ¿Cómo estás? Te escribimos de Enchiladitos. Queríamos saber cómo te fue con tu pedido y si te provoca consentirte con unos deliciosos antojitos hoy.`
    } else if (templateType === 'promo') {
      msg = `¡Hola ${name}! En Enchiladitos tenemos promociones especiales esta semana. ¡Pregúntanos por la variedad disponible para enviarte el menú!`
    } else if (templateType === 'debt_reminder') {
      const debt = whatsAppCustomer.total_debt || 0
      msg = `¡Hola ${name}! Te escribimos de Enchiladitos para recordarte tu saldo pendiente de $${Number(debt).toLocaleString('es-CO')}. Cuando puedas realizar tu abono nos confirmas por este medio. ¡Muchas gracias!`
    }

    const url = phone
      ? `https://wa.me/${phone.startsWith('57') ? phone : '57' + phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`

    window.open(url, '_blank')
    setIsWhatsAppModalOpen(false)
  }

  // Filtrado de Clientes
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const debt = c.total_debt || 0
      if (debtFilter === 'with_debt' && debt <= 0) return false
      if (debtFilter === 'clean' && debt > 0) return false
      return true
    })
  }, [customers, debtFilter])

  // KPIs Generales
  const totalCartera = useMemo(() => customers.reduce((acc, c) => acc + (c.total_debt || 0), 0), [customers])
  const clientesConDeudaCount = useMemo(() => customers.filter((c) => (c.total_debt || 0) > 0).length, [customers])

  // Exportar a CSV
  function exportCustomersCSV() {
    if (customers.length === 0) return
    let csv = 'ID,Nombre,Apellido,Telefono,Email,DeudaActual,Notas\n'
    customers.forEach((c) => {
      csv += `"${c.id}","${c.first_name}","${c.last_name || ''}","${c.phone || ''}","${c.email || ''}",${c.total_debt || 0},"${(c.notes || '').replace(/"/g, '""')}"\n`
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
              Directorio de Clientes
            </h1>
          </div>
          <p className="text-sm font-medium text-red-900/60 dark:text-red-300/60 mt-1">
            Control de cuentas por cobrar, abonos en orden FIFO, historial de compras y contacto por WhatsApp.
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

      {/* KPI Cards de Cartera */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#1c0707] p-5 rounded-3xl border border-red-200/70 dark:border-red-950/60 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950 text-red-600 dark:text-amber-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-900/60 dark:text-red-300/60">
              Total Clientes
            </span>
            <h3 className="text-xl font-black text-[#450a0a] dark:text-[#fef2f2]">
              {customers.length}
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1c0707] p-5 rounded-3xl border border-rose-200/70 dark:border-rose-950/60 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-900/70 dark:text-rose-300/70">
              Total Cartera (Deudas Activas)
            </span>
            <h3 className="text-xl font-black text-rose-600 dark:text-rose-400">
              ${totalCartera.toLocaleString('es-CO')}
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1c0707] p-5 rounded-3xl border border-amber-200/70 dark:border-amber-950/60 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
            <BadgeAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900/60 dark:text-amber-300/60">
              Clientes con Deuda Pendiente
            </span>
            <h3 className="text-xl font-black text-amber-600 dark:text-amber-400">
              {clientesConDeudaCount}
            </h3>
          </div>
        </div>
      </div>

      {/* Buscador y Filtros */}
      <div className="bg-white dark:bg-[#1c0707] p-4 rounded-3xl border border-red-200/80 dark:border-red-950/60 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-red-900/40 dark:text-red-400/40" />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono o email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200/60 dark:border-red-950 text-xs font-bold text-[#450a0a] dark:text-[#fef2f2] placeholder-red-900/40 focus:outline-none"
          />
        </div>

        {/* Filtros de Deuda */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'with_debt', label: 'Con Deuda' },
            { id: 'clean', label: 'Al Día' }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setDebtFilter(f.id)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-black whitespace-nowrap cursor-pointer transition-all ${
                debtFilter === f.id
                  ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-xs'
                  : 'bg-red-50/70 dark:bg-[#200808] text-red-950/70 dark:text-red-200/70 hover:bg-red-100/70'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Tarjetas de Clientes */}
      {loading ? (
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-600 border-t-transparent"></div>
          <p className="text-xs font-bold text-red-900/60 dark:text-red-400/60 mt-3">Cargando directorio...</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-[#1c0707] rounded-3xl border border-dashed border-red-200 dark:border-red-950 p-8">
          <Users className="w-12 h-12 mx-auto text-red-400/40 mb-3" />
          <p className="text-base font-black text-[#450a0a] dark:text-[#fef2f2]">No se encontraron clientes</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCustomers.map((c) => {
            const debt = c.total_debt || 0
            const hasDebt = debt > 0

            return (
              <div
                key={c.id}
                className="bg-white dark:bg-[#1c0707] p-5 rounded-3xl border border-red-200/80 dark:border-red-950/60 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-black text-sm text-[#450a0a] dark:text-[#fef2f2]">
                        {c.first_name} {c.last_name || ''}
                      </h3>
                      {hasDebt ? (
                        <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                          Debe: ${Number(debt).toLocaleString('es-CO')}
                        </span>
                      ) : (
                        <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          Al Día ($0)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {c.phone && (
                        <button
                          onClick={() => openWhatsAppTemplates(c)}
                          className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-colors cursor-pointer"
                          title="Enviar WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      )}
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
                  <div className="mt-3 space-y-1 text-xs text-red-950/70 dark:text-red-200/70">
                    {c.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span className="font-bold">{c.phone}</span>
                      </div>
                    )}
                    {c.email && (
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span className="font-medium truncate">{c.email}</span>
                      </div>
                    )}
                    {c.notes && (
                      <div className="p-2 rounded-xl bg-red-50/50 dark:bg-[#200808] border border-red-200/60 dark:border-red-950 text-[11px] italic mt-2">
                        "{c.notes}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Botón Ver Estado de Cuenta / Ficha 360 */}
                <div className="pt-3.5 mt-3 border-t border-red-100 dark:border-red-950 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-gray-500">
                    Ficha & Crédito
                  </span>

                  <button
                    onClick={() => openCustomer360(c)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-100 dark:bg-red-950 text-red-700 dark:text-amber-400 font-bold text-xs hover:bg-red-200 transition-colors cursor-pointer"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Estado de Cuenta</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Ficha 360 & Estado de Cuenta */}
      <Modal
        isOpen={is360ModalOpen}
        onClose={() => setIs360ModalOpen(false)}
        title={`Estado de Cuenta: ${selectedCustomer360?.first_name || ''} ${selectedCustomer360?.last_name || ''}`}
      >
        {selectedCustomer360 && (
          <div className="space-y-4">
            {/* KPIs de Cuenta */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-2xl bg-red-50 dark:bg-[#200808] border border-red-200">
                <span className="text-[9px] font-black uppercase text-gray-500">Total Comprado</span>
                <p className="text-base font-black text-[#450a0a] dark:text-[#fef2f2] mt-0.5">
                  ${Number(accountSummary?.total_sales || 0).toLocaleString('es-CO')}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200">
                <span className="text-[9px] font-black uppercase text-emerald-700">Total Pagado</span>
                <p className="text-base font-black text-emerald-600 mt-0.5">
                  ${Number(accountSummary?.total_paid || 0).toLocaleString('es-CO')}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200">
                <span className="text-[9px] font-black uppercase text-rose-700">Deuda Actual</span>
                <p className="text-base font-black text-rose-600 mt-0.5">
                  ${Number(accountSummary?.current_debt || 0).toLocaleString('es-CO')}
                </p>
              </div>
            </div>

            {/* Acciones Rápidas */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenAbono}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-black text-xs shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Abono / Pago</span>
              </button>

              <button
                onClick={handleSendAccountWhatsApp}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md cursor-pointer"
                title="Enviar Estado de Cuenta a WhatsApp"
              >
                <Send className="w-4 h-4" />
                <span>Enviar por WhatsApp</span>
              </button>
            </div>

            {/* Pestañas de Vista */}
            <div className="flex items-center gap-1 border-b border-red-100 dark:border-red-950 pb-2">
              {[
                { id: 'account', label: `Facturas con Deuda (${(accountSummary?.pending_sales || []).length})` },
                { id: 'payments', label: `Historial de Abonos (${(accountSummary?.payment_history || []).length})` }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all ${
                    activeTab === tab.id
                      ? 'bg-red-600 text-white'
                      : 'bg-red-50 dark:bg-[#200808] text-red-950/70 dark:text-red-200/70'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Contenido Pestaña 1: Facturas con Deuda */}
            {activeTab === 'account' && (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {loadingAccount ? (
                  <p className="text-xs text-center py-4 text-gray-500">Cargando...</p>
                ) : (accountSummary?.pending_sales || []).length === 0 ? (
                  <div className="text-center py-8 text-emerald-600 font-bold text-xs">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-1.5 opacity-80" />
                    <span>¡Este cliente no tiene facturas pendientes de pago!</span>
                  </div>
                ) : (
                  (accountSummary?.pending_sales || []).map((s) => (
                    <div
                      key={s.id}
                      className="p-3 rounded-2xl bg-rose-50/50 dark:bg-[#200808] border border-rose-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-rose-600" />
                          <span className="font-black">
                            {new Date(s.created_at).toLocaleString('es-CO', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5">
                          {(s.items || []).map((it) => `${it.quantity}x ${it.product_name}`).join(', ')}
                        </p>
                      </div>

                      <div className="text-right space-y-0.5">
                        <span className="block font-black text-rose-600 text-sm">
                          Debe: ${Number(s.pending_amount).toLocaleString('es-CO')}
                        </span>
                        <span className="block text-[10px] text-gray-500">
                          (Total: ${Number(s.total).toLocaleString('es-CO')} | Pagado: ${Number(s.paid_amount || 0).toLocaleString('es-CO')})
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Contenido Pestaña 2: Historial de Abonos */}
            {activeTab === 'payments' && (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {(accountSummary?.payment_history || []).length === 0 ? (
                  <p className="text-xs text-center py-8 text-gray-500 italic">
                    Aún no hay abonos registrados para este cliente.
                  </p>
                ) : (
                  (accountSummary?.payment_history || []).map((p) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-2xl bg-emerald-50/40 dark:bg-[#200808] border border-emerald-200/70 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                          <Coins className="w-3.5 h-3.5 text-emerald-600" />
                          <span>
                            {new Date(p.created_at).toLocaleString('es-CO', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <span className="block text-[10px] text-gray-500 uppercase mt-0.5">
                          {p.payment_method} {p.bank_details ? `(${p.bank_details})` : ''} {p.notes ? `• "${p.notes}"` : ''}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-black text-emerald-600 text-sm">
                          +${Number(p.amount).toLocaleString('es-CO')}
                        </span>
                        <button
                          onClick={() => handleSendAbonoWhatsApp(p)}
                          className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 cursor-pointer"
                          title="Enviar Comprobante a WhatsApp"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

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

      {/* Modal Registrar Abono */}
      <Modal isOpen={isAbonoModalOpen} onClose={() => setIsAbonoModalOpen(false)} title="Registrar Abono a Cuenta">
        <form onSubmit={handleProcessAbono} className="space-y-4">
          {abonoError && (
            <div className="p-3 rounded-2xl bg-red-100 text-red-700 text-xs font-bold">{abonoError}</div>
          )}

          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-[#200808] border border-amber-300 text-xs font-bold text-amber-900 dark:text-amber-200">
            <span>Cliente: <strong>{selectedCustomer360?.first_name} {selectedCustomer360?.last_name || ''}</strong></span>
            <div className="flex justify-between items-center mt-1">
              <span>Deuda Total Pendiente:</span>
              <span className="text-sm font-black text-rose-600">
                ${Number(accountSummary?.current_debt || 0).toLocaleString('es-CO')}
              </span>
            </div>
            <p className="text-[10px] text-amber-700 mt-1">
              * El abono amortizará automáticamente las facturas pendientes más antiguas a las más recientes (FIFO).
            </p>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-red-950 dark:text-red-200 mb-1">
              Monto a Abonar ($) *
            </label>
            <input
              type="number"
              min="100"
              required
              value={abonoAmount}
              onChange={(e) => setAbonoAmount(e.target.value)}
              placeholder="Ej. 20000"
              className="w-full px-4 py-2.5 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200 text-sm font-black focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-red-950 dark:text-red-200 mb-1">
              Método de Pago
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAbonoMethod('efectivo')}
                className={`py-2.5 rounded-2xl border text-xs font-black cursor-pointer ${
                  abonoMethod === 'efectivo' ? 'bg-red-600 text-white border-red-600' : 'bg-red-50/50 border-red-200 text-red-950'
                }`}
              >
                Efectivo
              </button>
              <button
                type="button"
                onClick={() => setAbonoMethod('transferencia')}
                className={`py-2.5 rounded-2xl border text-xs font-black cursor-pointer ${
                  abonoMethod === 'transferencia' ? 'bg-red-600 text-white border-red-600' : 'bg-red-50/50 border-red-200 text-red-950'
                }`}
              >
                Transferencia
              </button>
            </div>
          </div>

          {abonoMethod === 'transferencia' && (
            <div>
              <label className="block text-xs font-black uppercase text-red-950 dark:text-red-200 mb-1">
                Banco / Plataforma
              </label>
              <select
                value={abonoBank}
                onChange={(e) => setAbonoBank(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200 text-xs font-bold"
              >
                {COMMON_BANKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-black uppercase text-red-950 dark:text-red-200 mb-1">
              Notas / Observaciones (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej. Pago parcial por transferencia Nequi"
              value={abonoNotes}
              onChange={(e) => setAbonoNotes(e.target.value)}
              className="w-full px-4 py-2 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200 text-xs font-bold focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-red-100 dark:border-red-950">
            <button
              type="button"
              onClick={() => setIsAbonoModalOpen(false)}
              className="px-5 py-2.5 rounded-2xl text-xs font-bold text-red-950/70 hover:bg-red-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={abonoSubmitting}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 text-white font-black text-xs shadow-md cursor-pointer disabled:opacity-50"
            >
              {abonoSubmitting ? 'Guardando...' : 'Confirmar Abono'}
            </button>
          </div>
        </form>
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
                placeholder="Nombre..."
                className="w-full px-4 py-2 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200 text-xs font-bold focus:outline-none"
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
                placeholder="Apellido..."
                className="w-full px-4 py-2 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200 text-xs font-bold focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-red-950 dark:text-red-200 mb-1">
                Teléfono / WhatsApp
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Ej. 3001234567"
                className="w-full px-4 py-2 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200 text-xs font-bold focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-red-950 dark:text-red-200 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="correo@ejemplo.com"
                className="w-full px-4 py-2 rounded-2xl bg-red-50/50 dark:bg-[#200808] border border-red-200 text-xs font-bold focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-red-950 dark:text-red-200 mb-1">
              Notas & Preferencias
            </label>
            <textarea
              rows="3"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Le gusta el chamoy extra picante, cliente frecuente de los viernes..."
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
              {saving ? 'Guardando...' : editingCustomer ? 'Actualizar' : 'Crear Cliente'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Plantillas WhatsApp */}
      <Modal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        title={`Mensajes Rápidos: ${whatsAppCustomer?.first_name || ''}`}
      >
        <div className="space-y-3">
          <button
            onClick={() => sendWhatsAppMessage('greeting')}
            className="w-full p-4 rounded-2xl bg-red-50/60 dark:bg-[#200808] border border-red-200 text-left hover:bg-red-100/60 cursor-pointer transition-colors"
          >
            <h4 className="font-black text-xs text-[#450a0a] dark:text-[#fef2f2]">Saludo & Seguimiento</h4>
            <p className="text-[11px] text-gray-600 mt-1">Preguntar cómo le fue con su pedido anterior y si le provoca un antojo hoy.</p>
          </button>

          <button
            onClick={() => sendWhatsAppMessage('promo')}
            className="w-full p-4 rounded-2xl bg-amber-50/60 dark:bg-[#200808] border border-amber-200 text-left hover:bg-amber-100/60 cursor-pointer transition-colors"
          >
            <h4 className="font-black text-xs text-[#450a0a] dark:text-[#fef2f2]">Promociones Especiales</h4>
            <p className="text-[11px] text-gray-600 mt-1">Invitarlo a conocer la variedad de la semana en Enchiladitos.</p>
          </button>

          {whatsAppCustomer?.total_debt > 0 && (
            <button
              onClick={() => sendWhatsAppMessage('debt_reminder')}
              className="w-full p-4 rounded-2xl bg-rose-50/60 dark:bg-[#200808] border border-rose-200 text-left hover:bg-rose-100/60 cursor-pointer transition-colors"
            >
              <h4 className="font-black text-xs text-rose-700">Recordatorio Amable de Saldo Pendiente</h4>
              <p className="text-[11px] text-gray-600 mt-1">Recordar el saldo pendiente de ${Number(whatsAppCustomer.total_debt).toLocaleString('es-CO')}.</p>
            </button>
          )}
        </div>
      </Modal>
    </div>
  )
}
