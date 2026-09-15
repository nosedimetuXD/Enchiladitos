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
  CheckCircle2,
  FileSpreadsheet,
  Flame,
  Gift,
  Award,
  ChevronDown
} from 'lucide-react'
import { exportCustomersToExcel, exportCustomersToCSV } from '../utils/csvExport'
import { useAuth } from '../context/AuthContext'
import MetricLineChart from '../components/MetricLineChart'

const COMMON_BANKS = ['Bre-B/Llave', 'Nequi', 'Daviplata', 'Bancolombia', 'Nu', 'Davivienda', 'BBVA', 'Banco de Bogotá']

export default function Customers() {
  const { user } = useAuth()
  const isOwner = (user?.role || '').toLowerCase() === 'owner' || (user?.role || '').toLowerCase() === 'dueño'
  const isAdmin = (user?.role || '').toLowerCase() === 'admin' || (user?.role || '').toLowerCase() === 'administrador'
  const canExport = isOwner || isAdmin

  const [customers, setCustomers] = useState([])
  const [sales, setSales] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [debtFilter, setDebtFilter] = useState('all') // 'all' | 'with_debt' | 'clean' | 'with_reward'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedCustomerId, setExpandedCustomerId] = useState(null)

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
      setCustomers(Array.isArray(custData) ? custData : [])
      setSales(Array.isArray(salesData) ? salesData : [])
    } catch (err) {
      console.error('Error cargando clientes:', err)
      setError(err.message || 'Error al cargar los clientes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData(searchQuery)

    function handleRevalidate() {
      if (document.visibilityState === 'visible') {
        loadData(searchQuery)
      }
    }

    window.addEventListener('focus', handleRevalidate)
    document.addEventListener('visibilitychange', handleRevalidate)

    return () => {
      window.removeEventListener('focus', handleRevalidate)
      document.removeEventListener('visibilitychange', handleRevalidate)
    }
  }, [searchQuery])

  // Mapa de gasto acumulado por cliente
  const customerSpentMap = useMemo(() => {
    const map = {}
    sales.forEach((s) => {
      if (s.customer_id) {
        map[s.customer_id] = (map[s.customer_id] || 0) + (s.total || 0)
      }
    })
    return map
  }, [sales])

  const customersWithStats = useMemo(() => {
    return customers.map((c) => ({
      ...c,
      total_spent: customerSpentMap[c.id] || (c.stamps_info?.total_paid_eligible || 0)
    }))
  }, [customers, customerSpentMap])

  // Datos para MetricLineChart
  const customersTrendData = useMemo(() => {
    if (!customersWithStats || customersWithStats.length === 0) return []
    const sorted = [...customersWithStats].sort((a, b) => (Number(b?.total_spent) || 0) - (Number(a?.total_spent) || 0))
    return sorted.slice(0, 8).map((c) => {
      const cName = String(`${c?.first_name || ''} ${c?.last_name || ''}`.trim() || 'Cliente')
      return {
        label: cName.length > 7 ? cName.substring(0, 7) + '..' : cName,
        value: Number(c?.total_spent) || 0,
        secondaryValue: Number(c?.total_debt) || 0
      }
    })
  }, [customersWithStats])

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
      setCustomers(Array.isArray(custData) ? custData : [])
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

  function handleOpenEdit(customer, e) {
    e?.stopPropagation()
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

  async function handleDeleteCustomer(customer, e) {
    e?.stopPropagation()
    if (!isOwner) {
      alert('Solo el Dueño (Owner) tiene permisos para eliminar clientes.')
      return
    }
    const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Cliente'
    if (!window.confirm(`¿Eliminar al cliente "${fullName}"? Esta acción no se puede deshacer.`)) return

    try {
      await api.delete(`/customers/${customer.id}`)
      setCustomers((prev) => prev.filter((c) => c.id !== customer.id))
      if (selectedCustomer360?.id === customer.id) {
        setIs360ModalOpen(false)
      }
    } catch (err) {
      alert(err.message || 'Error al eliminar cliente')
    }
  }

  function handleOpenAbono(customer, e) {
    e?.stopPropagation()
    setSelectedCustomer360(customer)
    const debt = customer.total_debt || 0
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

  function openWhatsAppTemplates(customer, e) {
    e?.stopPropagation()
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
    return customersWithStats.filter((c) => {
      const debt = c.total_debt || 0
      if (debtFilter === 'with_debt' && debt <= 0) return false
      if (debtFilter === 'clean' && debt > 0) return false
      if (debtFilter === 'with_reward' && !c.stamps_info?.has_reward_unlocked) return false
      return true
    })
  }, [customersWithStats, debtFilter])

  // Métricas agregadas
  const totalSpentAll = useMemo(() => customersWithStats.reduce((sum, c) => sum + (Number(c.total_spent) || 0), 0), [customersWithStats])
  const totalCartera = useMemo(() => customers.reduce((acc, c) => acc + (c.total_debt || 0), 0), [customers])
  const clientesConDeudaCount = useMemo(() => customers.filter((c) => (c.total_debt || 0) > 0).length, [customers])
  const clientesAlDiaCount = useMemo(() => customers.filter((c) => (c.total_debt || 0) === 0).length, [customers])
  const clientesConPremioCount = useMemo(() => customers.filter((c) => c.stamps_info?.has_reward_unlocked).length, [customers])
  const totalCustomersCount = customers.length

  const topCustomer = useMemo(() => {
    if (customersWithStats.length === 0) return null
    return [...customersWithStats].sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0))[0]
  }, [customersWithStats])

  const promedioGasto = totalCustomersCount > 0 ? Math.round(totalSpentAll / totalCustomersCount) : 0

  function handleExportExcel() {
    exportCustomersToExcel(customersWithStats, `Clientes_Enchiladitos_${new Date().toISOString().slice(0, 10)}.xls`)
  }

  function handleExportCSV() {
    exportCustomersToCSV(customersWithStats, `Clientes_Enchiladitos_${new Date().toISOString().slice(0, 10)}.csv`)
  }

  return (
    <div className="space-y-6 text-[#450a0a] dark:text-[#fef2f2]">
      {/* Header Principal */}
      <div className="bg-white dark:bg-[#1a0606] border border-red-200/60 dark:border-red-950/60 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-50 dark:bg-[#200808] rounded-xl text-red-600 dark:text-amber-400 border border-red-200/60 dark:border-red-950/60">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#450a0a] dark:text-[#fef2f2]">
                Clientes & CRM
              </h1>
              <p className="text-xs text-red-900/60 dark:text-red-300/60 mt-0.5">
                Control de clientes, cuentas por cobrar, abonos, sellos de fidelidad y contacto directo.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
          {canExport && (
            <div className="inline-flex items-center p-0.5 bg-white dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 rounded-xl shadow-xs">
              <button
                type="button"
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-all cursor-pointer whitespace-nowrap"
                title="Descargar clientes en formato Excel (.xls)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Excel</span>
              </button>
              <div className="h-3.5 w-px bg-red-200/60 dark:border-red-950/60 mx-0.5" />
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-700 dark:text-amber-400 hover:bg-red-50 dark:hover:bg-[#2c0b0b] rounded-lg transition-all cursor-pointer whitespace-nowrap"
                title="Descargar clientes en formato CSV"
              >
                <Download className="w-3.5 h-3.5 text-red-700 dark:text-amber-400" />
                <span>CSV</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nuevo Cliente</span>
          </button>
        </div>
      </div>

      {/* Unified Metrics Bar — Asymmetric 2:1 Hero Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Large Hero Box (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1a0606] border border-red-200/60 dark:border-red-950/60 rounded-xl p-3.5 sm:p-4 flex flex-col justify-between shadow-xs relative overflow-hidden">
          {/* Header Row: Title & Total + Badge */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-red-900/70 dark:text-red-300/70 block">
                Facturación Acumulada Clientes
              </span>
              <div className="mt-0.5 text-2xl sm:text-3xl font-black tracking-tight text-[#450a0a] dark:text-[#fef2f2] tabular-nums">
                ${Number(totalSpentAll).toLocaleString('es-CO')}
              </div>
            </div>

            <div className="text-right">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                CRM & Fidelización
              </span>
              <div className="flex items-center justify-end gap-3 text-[10px] font-semibold mt-1">
                <span className="inline-flex items-center gap-1 text-red-700 dark:text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-red-600" /> Facturado
                </span>
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-300">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Cartera
                </span>
              </div>
            </div>
          </div>

          {/* Center Body: Full-Width MetricLineChart (Facturado vs Cartera) */}
          <div className="my-2.5 py-1 w-full">
            <MetricLineChart
              data={customersTrendData}
              line1Color="#dc2626"
              line2Color="#f59e0b"
              line1Label="Facturado"
              line2Label="Cartera"
              hasSecondary={true}
              formatValue={(v) => `$${Number(v).toLocaleString('es-CO')}`}
              height={125}
            />
          </div>

          {/* Sub-breakdown 3 columns at bottom */}
          <div className="mt-3 pt-2.5 border-t border-red-200/40 dark:border-red-950/40 grid grid-cols-3 gap-2">
            <div>
              <span className="text-[10px] font-semibold text-red-900/60 dark:text-red-300/60 block uppercase tracking-wider">
                Total Clientes
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#450a0a] dark:text-[#fef2f2] tabular-nums block mt-0.5">
                {totalCustomersCount} registrados
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 block uppercase tracking-wider">
                Clientes Al Día
              </span>
              <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums block mt-0.5">
                {clientesAlDiaCount} sin deuda
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 block uppercase tracking-wider">
                Con Cartera Activa
              </span>
              <span className="text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 tabular-nums block mt-0.5">
                {clientesConDeudaCount} pendientes
              </span>
            </div>
          </div>
        </div>

        {/* Stacked Side Cards (1 col) */}
        <div className="lg:col-span-1 flex flex-col gap-2">
          <div className="bg-white dark:bg-[#1a0606] border border-red-200/60 dark:border-red-950/60 rounded-xl p-2.5 sm:p-3 flex-1 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              <span>Cartera Pendiente</span>
              <Coins className="w-3.5 h-3.5" />
            </div>
            <div className="my-0.5 text-base sm:text-lg font-black tracking-tight text-rose-600 dark:text-rose-400 tabular-nums">
              ${Number(totalCartera).toLocaleString('es-CO')}
            </div>
            <span className="text-[10px] text-red-900/60 dark:text-red-300/60 font-normal">
              Saldo total por cobrar
            </span>
          </div>

          <div className="bg-white dark:bg-[#1a0606] border border-red-200/60 dark:border-red-950/60 rounded-xl p-2.5 sm:p-3 flex-1 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              <span>Top Comprador</span>
              <Award className="w-3.5 h-3.5" />
            </div>
            <div className="my-0.5 text-xs sm:text-sm font-bold text-[#450a0a] dark:text-[#fef2f2] truncate">
              {topCustomer ? `${topCustomer.first_name} ${topCustomer.last_name || ''}`.trim() : 'Sin registros'}
            </div>
            <span className="text-[10px] text-red-900/60 dark:text-red-300/60 font-normal tabular-nums">
              {topCustomer ? `$${Number(topCustomer.total_spent).toLocaleString('es-CO')} facturados` : 'N/A'}
            </span>
          </div>

          <div className="bg-white dark:bg-[#1a0606] border border-red-200/60 dark:border-red-950/60 rounded-xl p-2.5 sm:p-3 flex-1 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-red-900/70 dark:text-red-300/70">
              <span>Promedio de Gasto</span>
              <Wallet className="w-3.5 h-3.5" />
            </div>
            <div className="my-0.5 text-base sm:text-lg font-black tracking-tight text-[#450a0a] dark:text-[#fef2f2] tabular-nums">
              ${Number(promedioGasto).toLocaleString('es-CO')}
            </div>
            <span className="text-[10px] text-red-900/60 dark:text-red-300/60 font-normal">
              Gasto medio por cliente
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros Compacta */}
      <div className="bg-white dark:bg-[#1a0606] p-2.5 sm:p-3 rounded-2xl border border-red-200/60 dark:border-red-950/60 flex flex-col md:flex-row items-center gap-2.5 justify-between shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-red-900/40 dark:text-red-400/40" />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono o correo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-red-50/50 dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 text-xs font-medium text-[#450a0a] dark:text-[#fef2f2] placeholder-red-900/40 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>

        {/* Filtros Rápidos de Deuda y Fidelización */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-0.5 md:pb-0">
          {[
            { id: 'all', label: `Todos (${customers.length})` },
            { id: 'with_debt', label: `Con Deuda (${clientesConDeudaCount})` },
            { id: 'clean', label: `Al Día (${clientesAlDiaCount})` },
            { id: 'with_reward', label: `Premio 50% (${clientesConPremioCount})` }
          ].map((f) => (
            <button
              type="button"
              key={f.id}
              onClick={() => setDebtFilter(f.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                debtFilter === f.id
                  ? 'bg-red-600 text-white font-bold'
                  : 'text-red-900/70 dark:text-red-300/70 hover:bg-red-50 dark:hover:bg-[#200808]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Directorio de Clientes: Acordeones móviles y Tabla de escritorio */}
      <div className="bg-white dark:bg-[#1a0606] rounded-2xl border border-red-200/60 dark:border-red-950/60 overflow-hidden shadow-xs">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-7 w-7 border-3 border-red-600 border-t-transparent" />
            <p className="text-xs font-medium text-red-900/60 dark:text-red-400/60 mt-2">Cargando directorio...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-12 p-6">
            <Users className="w-10 h-10 mx-auto text-red-400/40 mb-2" />
            <p className="text-xs font-bold text-[#450a0a] dark:text-[#fef2f2]">No se encontraron clientes</p>
          </div>
        ) : (
          <>
            {/* VISTA MOVIL PARA CLIENTES (Acordeones Expandibles) */}
            <div className="block md:hidden divide-y divide-red-100 dark:divide-red-950/50">
              {filteredCustomers.map((c) => {
                const isExpanded = expandedCustomerId === c.id
                const fullName = `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Cliente'
                const initials = fullName.substring(0, 2).toUpperCase()
                const debt = Number(c.total_debt || 0)
                const isClean = debt === 0
                const stamps = c.stamps_info?.current_cycle_stamps ?? 0
                const hasReward = c.stamps_info?.has_reward_unlocked

                return (
                  <div key={c.id} className="transition-colors">
                    <div
                      onClick={() => setExpandedCustomerId(isExpanded ? null : c.id)}
                      className="p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-red-50/40 dark:hover:bg-red-950/20 transition-colors select-none"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-[#2c0b0b] text-red-600 dark:text-amber-400 font-black text-xs flex items-center justify-center border border-red-200/60 dark:border-red-900/40 shrink-0">
                          {initials}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs text-[#450a0a] dark:text-[#fef2f2] truncate">
                            {fullName}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-red-900/60 dark:text-red-300/50">
                              {c.phone || 'Sin teléfono'}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                              <Flame className="w-3 h-3" /> {stamps}/7
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span className={`text-xs font-bold tabular-nums block ${isClean ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {isClean ? 'Al Día' : `Debe: $${debt.toLocaleString('es-CO')}`}
                          </span>
                          {hasReward && (
                            <span className="inline-block px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[9px] font-bold">
                              50% OFF
                            </span>
                          )}
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 text-red-700 dark:text-red-400 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </div>

                    {/* Expandable Drawer */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 bg-red-50/30 dark:bg-[#200808]/50 border-t border-red-100 dark:border-red-950/40 space-y-3 animate-in fade-in duration-150">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 rounded-xl bg-white/80 dark:bg-[#140505]/70 border border-red-200/50 dark:border-red-950/40">
                            <span className="text-[10px] uppercase font-semibold text-red-900/60 dark:text-red-300/60 block">
                              Total Facturado
                            </span>
                            <span className="font-bold text-[#450a0a] dark:text-[#fef2f2] tabular-nums block mt-0.5">
                              ${Number(c.total_spent || 0).toLocaleString('es-CO')}
                            </span>
                          </div>
                          <div className="p-2 rounded-xl bg-white/80 dark:bg-[#140505]/70 border border-red-200/50 dark:border-red-950/40">
                            <span className="text-[10px] uppercase font-semibold text-red-900/60 dark:text-red-300/60 block">
                              Programa Sellos
                            </span>
                            <span className="font-semibold text-amber-600 dark:text-amber-400 block mt-0.5">
                              {stamps} sellos · {c.stamps_info?.rewards_redeemed || 0} canjes
                            </span>
                          </div>
                        </div>

                        {c.notes && (
                          <div className="p-2 rounded-xl bg-white/80 dark:bg-[#140505]/70 border border-red-200/50 dark:border-red-950/40 text-xs text-red-900/70 dark:text-red-300/70">
                            <span className="text-[10px] uppercase font-semibold text-red-900/50 dark:text-red-300/50 block">Notas:</span>
                            {c.notes}
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-2 border-t border-red-200/40 dark:border-red-950/40 flex-wrap">
                          <button
                            type="button"
                            onClick={() => openCustomer360(c)}
                            className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold text-[#450a0a] dark:text-[#fef2f2] bg-white dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-red-600" />
                            <span>Ficha 360</span>
                          </button>

                          {debt > 0 && (
                            <button
                              type="button"
                              onClick={(e) => handleOpenAbono(c, e)}
                              className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Coins className="w-3.5 h-3.5" />
                              <span>Abonar</span>
                            </button>
                          )}

                          {c.phone && (
                            <button
                              type="button"
                              onClick={(e) => openWhatsAppTemplates(c, e)}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/40 cursor-pointer"
                              title="WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => handleOpenEdit(c, e)}
                            className="p-1.5 rounded-lg text-red-700 dark:text-amber-400 bg-white dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {isOwner && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteCustomer(c, e)}
                              className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 cursor-pointer"
                              title="Eliminar (Solo Dueño)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* VISTA ESCRITORIO PARA CLIENTES (Linear Table) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-red-50/40 dark:bg-[#200808] border-b border-red-200/60 dark:border-red-950/60 text-red-900/70 dark:text-red-300/70 uppercase font-semibold text-[11px] tracking-wider">
                  <tr>
                    <th className="px-2.5 py-2 whitespace-nowrap">Cliente</th>
                    <th className="px-2.5 py-2 whitespace-nowrap">Teléfono / Correo</th>
                    <th className="px-2.5 py-2 whitespace-nowrap text-center">Fidelización</th>
                    <th className="px-2.5 py-2 text-right whitespace-nowrap">Facturado</th>
                    <th className="px-2.5 py-2 text-right whitespace-nowrap">Saldo Deuda</th>
                    <th className="px-2.5 py-2 text-right whitespace-nowrap w-24 min-w-[90px]">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-100 dark:divide-red-950/40">
                  {filteredCustomers.map((c) => {
                    const fullName = `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Cliente'
                    const debt = Number(c.total_debt || 0)
                    const isClean = debt === 0
                    const stamps = c.stamps_info?.current_cycle_stamps ?? 0
                    const hasReward = c.stamps_info?.has_reward_unlocked

                    return (
                      <tr
                        key={c.id}
                        onClick={() => openCustomer360(c)}
                        className="hover:bg-red-50/30 dark:hover:bg-red-950/20 transition-colors duration-100 group cursor-pointer"
                      >
                        <td className="px-2.5 py-1.5 font-medium text-[#450a0a] dark:text-[#fef2f2] whitespace-nowrap text-xs">
                          <div className="font-semibold text-[#450a0a] dark:text-[#fef2f2] text-xs group-hover:text-red-600 transition-colors">
                            {fullName}
                          </div>
                          {c.notes && (
                            <div className="text-[10px] text-red-900/50 dark:text-red-300/50 line-clamp-1 max-w-[200px]">{c.notes}</div>
                          )}
                        </td>
                        <td className="px-2.5 py-1.5 text-red-900/70 dark:text-red-300/60 font-normal text-xs whitespace-nowrap">
                          <div>{c.phone || '-'}</div>
                          {c.email && <div className="text-[10px] text-red-900/40 dark:text-red-300/40">{c.email}</div>}
                        </td>
                        <td className="px-2.5 py-1.5 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[10px] font-semibold border ${
                            hasReward
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/60'
                              : 'bg-red-50 dark:bg-[#200808] text-red-800 dark:text-amber-400 border-red-200/50 dark:border-red-950/40'
                          }`}>
                            <Flame className="w-3 h-3" />
                            {stamps}/7 Sellos {hasReward && '· 50% OFF'}
                          </span>
                        </td>
                        <td className="px-2.5 py-1.5 font-bold text-[#450a0a] dark:text-[#fef2f2] text-xs text-right tabular-nums whitespace-nowrap">
                          ${Number(c.total_spent || 0).toLocaleString('es-CO')}
                        </td>
                        <td className="px-2.5 py-1.5 text-right tabular-nums whitespace-nowrap">
                          {isClean ? (
                            <span className="text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold">Al día</span>
                          ) : (
                            <span className="font-bold text-rose-600 dark:text-rose-400 text-xs">
                              ${debt.toLocaleString('es-CO')}
                            </span>
                          )}
                        </td>
                        <td className="px-2.5 py-1.5 text-right whitespace-nowrap w-24 min-w-[90px]">
                          <div className="flex items-center justify-end gap-1">
                            {debt > 0 && (
                              <button
                                type="button"
                                onClick={(e) => handleOpenAbono(c, e)}
                                className="p-1 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-md transition-colors cursor-pointer"
                                title="Registrar Abono"
                              >
                                <Coins className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {c.phone && (
                              <button
                                type="button"
                                onClick={(e) => openWhatsAppTemplates(c, e)}
                                className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-md transition-colors cursor-pointer"
                                title="Enviar mensaje WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={(e) => handleOpenEdit(c, e)}
                              className="p-1 text-red-700 dark:text-amber-400 hover:text-[#450a0a] dark:hover:text-white hover:bg-red-100 dark:hover:bg-[#2c0b0b] rounded-md transition-colors cursor-pointer"
                              title="Editar Cliente"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {isOwner && (
                              <button
                                type="button"
                                onClick={(e) => handleDeleteCustomer(c, e)}
                                className="p-1 text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors cursor-pointer"
                                title="Eliminar Cliente (Solo Dueño)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal Ficha 360 & Estado de Cuenta */}
      <Modal
        isOpen={is360ModalOpen}
        onClose={() => setIs360ModalOpen(false)}
        title={selectedCustomer360 ? `Ficha de ${selectedCustomer360.first_name} ${selectedCustomer360.last_name || ''}` : 'Ficha del Cliente'}
        maxWidth="max-w-2xl"
      >
        {selectedCustomer360 && (
          <div className="space-y-4">
            {/* Header del Cliente */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-red-50/50 dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-[#2c0b0b] text-red-600 dark:text-amber-400 font-bold flex items-center justify-center text-sm border border-red-200/60 dark:border-red-900/40">
                  {selectedCustomer360.first_name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#450a0a] dark:text-[#fef2f2]">
                    {selectedCustomer360.first_name} {selectedCustomer360.last_name || ''}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-red-900/60 dark:text-red-300/60 mt-0.5">
                    {selectedCustomer360.phone && <span>Tel: {selectedCustomer360.phone}</span>}
                    {selectedCustomer360.email && <span>· {selectedCustomer360.email}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedCustomer360.phone && (
                  <button
                    type="button"
                    onClick={handleSendAccountWhatsApp}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                )}
                {isOwner && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteCustomer(selectedCustomer360, e)}
                    className="p-1.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 cursor-pointer"
                    title="Eliminar Cliente"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Resumen Financiero & Fidelización */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#140505] border border-red-200/60 dark:border-red-950/60 text-center">
                <span className="text-[10px] uppercase font-semibold text-red-900/60 dark:text-red-300/60 block">Total Compras</span>
                <span className="font-bold text-xs sm:text-sm text-[#450a0a] dark:text-[#fef2f2] tabular-nums block mt-0.5">
                  ${Number(accountSummary?.total_sales || selectedCustomer360.total_spent || 0).toLocaleString('es-CO')}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#140505] border border-red-200/60 dark:border-red-950/60 text-center">
                <span className="text-[10px] uppercase font-semibold text-emerald-700 dark:text-emerald-400 block">Total Pagado</span>
                <span className="font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 tabular-nums block mt-0.5">
                  ${Number(accountSummary?.total_paid || 0).toLocaleString('es-CO')}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#140505] border border-red-200/60 dark:border-red-950/60 text-center">
                <span className="text-[10px] uppercase font-semibold text-rose-600 dark:text-rose-400 block">Saldo Pendiente</span>
                <span className="font-bold text-xs sm:text-sm text-rose-600 dark:text-rose-400 tabular-nums block mt-0.5">
                  ${Number(accountSummary?.current_debt || selectedCustomer360.total_debt || 0).toLocaleString('es-CO')}
                </span>
              </div>
            </div>

            {/* Tarjeta de Fidelidad */}
            {selectedCustomer360.stamps_info && (
              <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-300/60 dark:border-amber-900/40 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-600" />
                    Tarjeta de Sellos Digital
                  </span>
                  <span className="font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                    {selectedCustomer360.stamps_info.current_cycle_stamps}/7 Sellos
                  </span>
                </div>
                <div className="w-full bg-amber-200/60 dark:bg-amber-950 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-red-500 h-2 rounded-full transition-all"
                    style={{ width: `${selectedCustomer360.stamps_info.progress_percent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-amber-900/70 dark:text-amber-300/70">
                  <span>Recompensas disponibles: {selectedCustomer360.stamps_info.available_rewards}</span>
                  <span>Faltan: ${Number(selectedCustomer360.stamps_info.amount_to_next_stamp).toLocaleString('es-CO')} para próximo sello</span>
                </div>
              </div>
            )}

            {/* Tabs de Cuenta */}
            <div className="flex items-center gap-1 border-b border-red-200/40 dark:border-red-950/40 pb-1">
              <button
                type="button"
                onClick={() => setActiveTab('account')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'account'
                    ? 'bg-red-600 text-white'
                    : 'text-red-900/70 dark:text-red-300/70 hover:bg-red-50'
                }`}
              >
                Ventas a Crédito ({accountSummary?.credit_sales?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('payments')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'payments'
                    ? 'bg-red-600 text-white'
                    : 'text-red-900/70 dark:text-red-300/70 hover:bg-red-50'
                }`}
              >
                Historial de Abonos ({accountSummary?.payments?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('all_sales')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'all_sales'
                    ? 'bg-red-600 text-white'
                    : 'text-red-900/70 dark:text-red-300/70 hover:bg-red-50'
                }`}
              >
                Todas las Ventas ({accountSummary?.all_sales?.length || 0})
              </button>
            </div>

            {/* Contenido de Tabs */}
            <div className="max-h-60 overflow-y-auto space-y-1.5">
              {activeTab === 'account' && (
                <div>
                  {(!accountSummary?.credit_sales || accountSummary.credit_sales.length === 0) ? (
                    <p className="text-xs text-center py-6 text-red-900/50">No hay compras con saldo pendiente</p>
                  ) : (
                    accountSummary.credit_sales.map((cs) => (
                      <div key={cs.sale_id} className="p-2 rounded-lg bg-red-50/50 dark:bg-[#200808] border border-red-200/50 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-[#450a0a] dark:text-[#fef2f2]">Venta #{String(cs.sale_id).slice(-4)}</span>
                          <span className="text-[10px] text-red-900/50 block">{new Date(cs.created_at).toLocaleDateString('es-CO')}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-rose-600 tabular-nums block">Debe: ${Number(cs.pending_amount).toLocaleString('es-CO')}</span>
                          <span className="text-[10px] text-gray-500 tabular-nums">Total: ${Number(cs.total_amount).toLocaleString('es-CO')}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'payments' && (
                <div>
                  {(!accountSummary?.payments || accountSummary.payments.length === 0) ? (
                    <p className="text-xs text-center py-6 text-red-900/50">No hay abonos registrados</p>
                  ) : (
                    accountSummary.payments.map((p) => (
                      <div key={p.id} className="p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-emerald-800 dark:text-emerald-300">Abono {p.payment_method.toUpperCase()}</span>
                          <span className="text-[10px] text-emerald-700/60 block">{new Date(p.created_at).toLocaleString('es-CO')}</span>
                        </div>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                          +${Number(p.amount).toLocaleString('es-CO')}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'all_sales' && (
                <div>
                  {(!accountSummary?.all_sales || accountSummary.all_sales.length === 0) ? (
                    <p className="text-xs text-center py-6 text-red-900/50">Sin historial de ventas</p>
                  ) : (
                    accountSummary.all_sales.map((as) => (
                      <div key={as.id} className="p-2 rounded-lg bg-red-50/30 dark:bg-[#200808] border border-red-200/40 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-[#450a0a] dark:text-[#fef2f2]">Venta #{String(as.id).slice(-4)}</span>
                          <span className="text-[10px] text-red-900/50 block">{new Date(as.created_at).toLocaleDateString('es-CO')} · {as.payment_method}</span>
                        </div>
                        <span className="font-bold text-[#450a0a] dark:text-[#fef2f2] tabular-nums">
                          ${Number(as.total).toLocaleString('es-CO')}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Footer de Ficha 360 */}
            <div className="flex items-center justify-between pt-3 border-t border-red-200/40 dark:border-red-950/40">
              <button
                type="button"
                onClick={() => setIs360ModalOpen(false)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold text-red-900/70 hover:bg-red-50 cursor-pointer"
              >
                Cerrar
              </button>

              {(accountSummary?.current_debt || selectedCustomer360.total_debt || 0) > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setIs360ModalOpen(false)
                    handleOpenAbono(selectedCustomer360)
                  }}
                  className="px-5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>Registrar Abono</span>
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Registrar Abono */}
      <Modal
        isOpen={isAbonoModalOpen}
        onClose={() => setIsAbonoModalOpen(false)}
        title={selectedCustomer360 ? `Registrar Abono: ${selectedCustomer360.first_name}` : 'Registrar Abono'}
      >
        <form onSubmit={handleProcessAbono} className="space-y-4">
          {abonoError && (
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200">
              {abonoError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase text-red-900/70 dark:text-red-300/70 mb-1">
              Monto del Abono ($) *
            </label>
            <input
              type="number"
              required
              min="100"
              step="50"
              value={abonoAmount}
              onChange={(e) => setAbonoAmount(e.target.value)}
              placeholder="50000"
              className="w-full px-3 py-2 rounded-xl bg-red-50/50 dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-red-500 tabular-nums"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-red-900/70 dark:text-red-300/70 mb-1">
                Método de Pago
              </label>
              <select
                value={abonoMethod}
                onChange={(e) => setAbonoMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-red-50/50 dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 text-xs font-medium cursor-pointer focus:outline-none"
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </div>

            {abonoMethod === 'transferencia' && (
              <div>
                <label className="block text-xs font-semibold uppercase text-red-900/70 dark:text-red-300/70 mb-1">
                  Banco / Llave
                </label>
                <select
                  value={abonoBank}
                  onChange={(e) => setAbonoBank(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-red-50/50 dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 text-xs font-medium cursor-pointer focus:outline-none"
                >
                  {COMMON_BANKS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-red-900/70 dark:text-red-300/70 mb-1">
              Notas adicionales
            </label>
            <input
              type="text"
              value={abonoNotes}
              onChange={(e) => setAbonoNotes(e.target.value)}
              placeholder="Ej. Abono cuota semana 2..."
              className="w-full px-3 py-2 rounded-xl bg-red-50/50 dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 text-xs font-medium focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-red-200/40 dark:border-red-950/40">
            <button
              type="button"
              onClick={() => setIsAbonoModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-red-900/70 hover:bg-red-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={abonoSubmitting}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs cursor-pointer disabled:opacity-50"
            >
              {abonoSubmitting ? 'Registrando...' : 'Confirmar Abono'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Plantillas WhatsApp */}
      <Modal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        title={whatsAppCustomer ? `WhatsApp: ${whatsAppCustomer.first_name}` : 'WhatsApp'}
      >
        <div className="space-y-3">
          <p className="text-xs text-red-900/70 dark:text-red-300/70">
            Selecciona la plantilla predefinida para abrir la conversación en WhatsApp Web / Móvil:
          </p>

          <button
            type="button"
            onClick={() => sendWhatsAppMessage('greeting')}
            className="w-full p-3 rounded-xl bg-red-50/50 dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 text-left hover:bg-red-100/60 cursor-pointer transition-colors"
          >
            <div className="font-bold text-xs text-[#450a0a] dark:text-[#fef2f2]">Saludo & Seguimiento</div>
            <p className="text-[11px] text-red-900/60 dark:text-red-300/50 mt-0.5">
              Preguntar cómo estuvo el pedido y si desea ordenar de nuevo.
            </p>
          </button>

          <button
            type="button"
            onClick={() => sendWhatsAppMessage('promo')}
            className="w-full p-3 rounded-xl bg-red-50/50 dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 text-left hover:bg-red-100/60 cursor-pointer transition-colors"
          >
            <div className="font-bold text-xs text-[#450a0a] dark:text-[#fef2f2]">Promociones Especiales</div>
            <p className="text-[11px] text-red-900/60 dark:text-red-300/50 mt-0.5">
              Compartir opciones y novedades del menú semanal.
            </p>
          </button>

          {(whatsAppCustomer?.total_debt || 0) > 0 && (
            <button
              type="button"
              onClick={() => sendWhatsAppMessage('debt_reminder')}
              className="w-full p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 text-left hover:bg-rose-100/60 cursor-pointer transition-colors"
            >
              <div className="font-bold text-xs text-rose-700 dark:text-rose-400">Recordatorio de Saldo Pendiente</div>
              <p className="text-[11px] text-rose-900/60 dark:text-rose-300/50 mt-0.5">
                Recordatorio cordial del saldo de ${Number(whatsAppCustomer.total_debt).toLocaleString('es-CO')}.
              </p>
            </button>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setIsWhatsAppModalOpen(false)}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold text-red-900/70 hover:bg-red-50 cursor-pointer"
            >
              Cancelar
            </button>
          </div>
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
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200">
              {modalError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-red-900/70 dark:text-red-300/70 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="Ej. Juan"
                className="w-full px-3 py-1.5 rounded-xl bg-red-50/50 dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-red-900/70 dark:text-red-300/70 mb-1">
                Apellido
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="Ej. Pérez"
                className="w-full px-3 py-1.5 rounded-xl bg-red-50/50 dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-red-900/70 dark:text-red-300/70 mb-1">
                Teléfono / WhatsApp
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="3001234567"
                className="w-full px-3 py-1.5 rounded-xl bg-red-50/50 dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-red-900/70 dark:text-red-300/70 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="cliente@ejemplo.com"
                className="w-full px-3 py-1.5 rounded-xl bg-red-50/50 dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-red-900/70 dark:text-red-300/70 mb-1">
              Notas / Preferencias
            </label>
            <textarea
              rows="2"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Ej. Le gusta extra chamoy, cliente frecuente..."
              className="w-full px-3 py-1.5 rounded-xl bg-red-50/50 dark:bg-[#200808] border border-red-200/60 dark:border-red-950/60 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-red-200/40 dark:border-red-950/40">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-red-900/70 hover:bg-red-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-semibold text-xs shadow-xs cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Guardando...' : editingCustomer ? 'Actualizar Cliente' : 'Crear Cliente'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
