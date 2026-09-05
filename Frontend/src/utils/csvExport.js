/**
 * Utilidad universal para exportacion de datos a formato Excel (.xls con estilos nativos)
 * y formato CSV estandar con codificacion UTF-8 BOM.
 */

function escapeCSV(val) {
  if (val === null || val === undefined) return '""'
  const str = String(val).replace(/"/g, '""')
  return `"${str}"`
}

function escapeXML(val) {
  if (val === null || val === undefined) return ''
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function downloadCSV(filename, csvContent) {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function downloadExcelXML(filename, sheetName, headers, rows) {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#450A0A"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#991B1B"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Bold="1" ss:Color="#FFFFFF" ss:Size="11"/>
   <Interior ss:Color="#DC2626" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Currency">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <NumberFormat ss:Format="$#,##0"/>
  </Style>
  <Style ss:ID="Number">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <NumberFormat ss:Format="#,##0"/>
  </Style>
  <Style ss:ID="Center">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="Bold">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Bold="1" ss:Color="#450A0A"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${escapeXML(sheetName)}">
  <Table>
`

  // Header row
  xml += '   <Row ss:Height="26">\n'
  headers.forEach((h) => {
    xml += `    <Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXML(h)}</Data></Cell>\n`
  })
  xml += '   </Row>\n'

  // Data rows
  rows.forEach((r) => {
    xml += '   <Row ss:Height="20">\n'
    r.forEach((cell) => {
      const val = typeof cell === 'object' && cell !== null && 'value' in cell ? cell.value : cell
      const style = typeof cell === 'object' && cell !== null && cell.style ? cell.style : (typeof val === 'number' ? 'Currency' : 'Default')

      if (typeof val === 'number') {
        xml += `    <Cell ss:StyleID="${style}"><Data ss:Type="Number">${val}</Data></Cell>\n`
      } else {
        xml += `    <Cell ss:StyleID="${style}"><Data ss:Type="String">${escapeXML(val || '')}</Data></Cell>\n`
      }
    })
    xml += '   </Row>\n'
  })

  xml += `  </Table>
 </Worksheet>
</Workbook>`

  const actualFilename = filename.endsWith('.xls') ? filename : `${filename.replace(/\.csv$/, '')}.xls`
  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', actualFilename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function cleanDescription(item) {
  if (item.type === 'sale') {
    return item.customer_name || (item.description || '').replace(/^Venta POS - /i, '') || 'Cliente General'
  }
  if (item.type === 'customer_payment') {
    return (item.description || '').replace(/^(Abono a Deuda|Abono Deuda) - /i, '') || item.customer_name || 'Cliente'
  }
  return item.description || ''
}

// ----------------------------------------------------
// CONTABILIDAD (Excel & CSV)
// ----------------------------------------------------
const ACCOUNTING_HEADERS = [
  'Fecha & Hora',
  'Tipo / Origen',
  'Descripción / Concepto',
  'Categoría',
  'Método de Pago',
  'Monto ($)',
  'Vendido Por'
]

function buildAccountingRows(expenses = [], incomes = []) {
  const rows = []

  expenses.forEach((e) => {
    rows.push([
      new Date(e.created_at).toLocaleString('es-CO'),
      'GASTO / EGRESO',
      e.description || '',
      (e.category || 'Otros').toUpperCase(),
      (e.payment_method || 'efectivo').toUpperCase(),
      { value: -(Number(e.amount) || 0), style: 'Currency' },
      e.registerer_name || 'Personal'
    ])
  })

  incomes.forEach((i) => {
    const isSale = i.type === 'sale'
    const desc = cleanDescription(i)
    const origin = isSale ? 'VENTA POS' : (i.type === 'customer_payment' ? 'ABONO DEUDA' : 'INGRESO EXTRA')
    const category = isSale ? 'VENTA POS' : (i.type === 'customer_payment' ? 'ABONO DEUDA' : (i.category || 'Otros').toUpperCase())
    const payMethod = i.bank_details ? `${(i.payment_method || '').toUpperCase()} (${i.bank_details})` : (i.payment_method || 'efectivo').toUpperCase()

    rows.push([
      new Date(i.created_at).toLocaleString('es-CO'),
      origin,
      desc,
      category,
      payMethod,
      { value: Number(i.amount) || 0, style: 'Currency' },
      i.registerer_name || (isSale ? 'Caja POS' : 'Personal')
    ])
  })

  return rows
}

export function exportAccountingToExcel(expenses = [], incomes = [], filename = 'contabilidad_enchiladitos.xls') {
  if (expenses.length === 0 && incomes.length === 0) {
    alert('No hay movimientos contables para exportar')
    return
  }
  const rows = buildAccountingRows(expenses, incomes)
  downloadExcelXML(filename, 'Flujo de Caja', ACCOUNTING_HEADERS, rows)
}

export function exportAccountingToCSV(expenses = [], incomes = [], filename = 'contabilidad_enchiladitos.csv') {
  if (expenses.length === 0 && incomes.length === 0) {
    alert('No hay movimientos contables para exportar')
    return
  }
  const rows = buildAccountingRows(expenses, incomes)
  const csvRows = rows.map((r) => r.map((c) => escapeCSV(typeof c === 'object' && c !== null ? c.value : c)).join(','))
  const csvContent = [ACCOUNTING_HEADERS.map(escapeCSV).join(','), ...csvRows].join('\r\n')
  downloadCSV(filename, csvContent)
}

// ----------------------------------------------------
// VENTAS (Excel & CSV)
// ----------------------------------------------------
const SALES_HEADERS = [
  'Fecha y Hora',
  'Vendido Por',
  'Cliente',
  'Método de Pago',
  'Detalles de Banco',
  'Subtotal ($)',
  'Descuento (%)',
  'Descuento ($)',
  'Total Facturado ($)',
  'Total Cobrado ($)',
  'Saldo Pendiente ($)',
  'Estado',
  'Detalle de Productos'
]

function buildSalesRows(sales = []) {
  return sales.map((s) => {
    const itemsStr = (s.items || [])
      .map((i) => `${i.product_name || 'Producto'} (x${i.quantity}) - $${Number(i.unit_price || 0).toLocaleString('es-CO')}`)
      .join(' | ')

    const paid = s.paid_amount !== undefined ? s.paid_amount : s.total
    const pending = s.pending_amount || 0
    const status = pending === 0 ? 'PAGADO' : (paid > 0 ? 'PARCIAL' : 'PENDIENTE')

    return [
      new Date(s.created_at).toLocaleString('es-CO'),
      s.sold_by_name || s.sold_by_username || 'Personal',
      s.customer_name || 'Cliente General',
      (s.payment_method || 'efectivo').toUpperCase(),
      s.bank_details || '',
      { value: Number(s.subtotal || s.total || 0), style: 'Currency' },
      { value: Number(s.discount_percent || 0), style: 'Number' },
      { value: Number(s.discount_amount || 0), style: 'Currency' },
      { value: Number(s.total || 0), style: 'Currency' },
      { value: Number(paid), style: 'Currency' },
      { value: Number(pending), style: 'Currency' },
      status,
      itemsStr
    ]
  })
}

export function exportSalesToExcel(sales = [], filename = 'ventas_enchiladitos.xls') {
  if (!sales || sales.length === 0) {
    alert('No hay ventas para exportar')
    return
  }
  const rows = buildSalesRows(sales)
  downloadExcelXML(filename, 'Ventas', SALES_HEADERS, rows)
}

export function exportSalesToCSV(sales = [], filename = 'ventas_enchiladitos.csv') {
  if (!sales || sales.length === 0) {
    alert('No hay ventas para exportar')
    return
  }
  const rows = buildSalesRows(sales)
  const csvRows = rows.map((r) => r.map((c) => escapeCSV(typeof c === 'object' && c !== null ? c.value : c)).join(','))
  const csvContent = [SALES_HEADERS.map(escapeCSV).join(','), ...csvRows].join('\r\n')
  downloadCSV(filename, csvContent)
}

// ----------------------------------------------------
// CLIENTES (Excel & CSV)
// ----------------------------------------------------
const CUSTOMERS_HEADERS = [
  'Nombre',
  'Apellido',
  'Teléfono',
  'Email',
  'Deuda Actual ($)',
  'Notas / Preferencias'
]

function buildCustomersRows(customers = []) {
  return customers.map((c) => [
    c.first_name || '',
    c.last_name || '',
    c.phone || '',
    c.email || '',
    { value: Number(c.total_debt || 0), style: 'Currency' },
    c.notes || ''
  ])
}

export function exportCustomersToExcel(customers = [], filename = 'clientes_enchiladitos.xls') {
  if (!customers || customers.length === 0) {
    alert('No hay clientes para exportar')
    return
  }
  const rows = buildCustomersRows(customers)
  downloadExcelXML(filename, 'Clientes', CUSTOMERS_HEADERS, rows)
}

export function exportCustomersToCSV(customers = [], filename = 'clientes_enchiladitos.csv') {
  if (!customers || customers.length === 0) {
    alert('No hay clientes para exportar')
    return
  }
  const rows = buildCustomersRows(customers)
  const csvRows = rows.map((r) => r.map((c) => escapeCSV(typeof c === 'object' && c !== null ? c.value : c)).join(','))
  const csvContent = [CUSTOMERS_HEADERS.map(escapeCSV).join(','), ...csvRows].join('\r\n')
  downloadCSV(filename, csvContent)
}
