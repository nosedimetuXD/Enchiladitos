import { jsPDF } from 'jspdf'

/**
 * Genera un comprobante de venta en PDF con diseño profesional de Enchiladitos.
 * @param {Object} order - Objeto con los datos de la venta
 * @returns {jsPDF} Instancia del documento jsPDF generado
 */
export function createReceiptPDF(order) {
  // Dimensiones tipo ticket POS (80mm de ancho x 160mm+ de alto según items)
  const itemsCount = (order.items || []).length
  const dynamicHeight = Math.max(160, 100 + itemsCount * 10)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, dynamicHeight]
  })

  let y = 10

  // Encabezado
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(180, 20, 20) // Rojo Enchiladitos
  doc.text('ENCHILADITOS', 40, y, { align: 'center' })
  y += 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text('Sabor, Chamoy y Fuego', 40, y, { align: 'center' })
  y += 4

  const dateStr = new Date(order.created_at || Date.now()).toLocaleString('es-CO')
  doc.setFontSize(7)
  doc.text(dateStr, 40, y, { align: 'center' })
  y += 6

  // Línea divisoria
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.3)
  doc.line(6, y, 74, y)
  y += 5

  // Datos del Cliente y Pago
  doc.setFontSize(8)
  doc.setTextColor(30, 30, 30)

  doc.setFont('helvetica', 'bold')
  doc.text('Cliente:', 6, y)
  doc.setFont('helvetica', 'normal')
  doc.text(order.customer_name || 'Cliente General', 22, y)
  y += 4.5

  doc.setFont('helvetica', 'bold')
  doc.text('Pago:', 6, y)
  doc.setFont('helvetica', 'normal')
  doc.text((order.payment_method || 'EFECTIVO').toUpperCase(), 22, y)
  if (order.bank_details) {
    y += 4
    doc.setFontSize(7)
    doc.setTextColor(100, 100, 100)
    doc.text(`(${order.bank_details})`, 22, y)
  }
  y += 5

  // Cabecera de la tabla de productos
  doc.setDrawColor(200, 200, 200)
  doc.line(6, y, 74, y)
  y += 4

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(50, 50, 50)
  doc.text('Cant.  Producto', 6, y)
  doc.text('Total', 74, y, { align: 'right' })
  y += 3

  doc.line(6, y, 74, y)
  y += 4

  // Lista de Productos
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(30, 30, 30)

  ;(order.items || []).forEach((it) => {
    const name = it.product?.name || it.product_name || 'Producto'
    const qty = it.quantity || 1
    const price = it.product?.price || it.unit_price || 0
    const itemTotal = price * qty

    // Truncar nombre si es muy largo
    const shortName = name.length > 20 ? name.slice(0, 18) + '...' : name

    doc.text(`${qty}x  ${shortName}`, 6, y)
    doc.text(`$${itemTotal.toLocaleString('es-CO')}`, 74, y, { align: 'right' })
    y += 4.5
  })

  y += 1
  doc.setDrawColor(200, 200, 200)
  doc.line(6, y, 74, y)
  y += 4.5

  // Totales
  const subtotal = order.subtotal || order.total || 0
  const discountAmount = order.discount_amount || 0
  const total = order.total || 0

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.text('Subtotal:', 6, y)
  doc.text(`$${subtotal.toLocaleString('es-CO')}`, 74, y, { align: 'right' })
  y += 4

  if (discountAmount > 0) {
    doc.setTextColor(200, 30, 30)
    const reason = order.discount_reason ? ` (${order.discount_reason})` : ''
    doc.text(`Descuento${reason}:`, 6, y)
    doc.text(`-$${discountAmount.toLocaleString('es-CO')}`, 74, y, { align: 'right' })
    y += 4
    doc.setTextColor(30, 30, 30)
  }

  y += 1
  doc.setDrawColor(180, 20, 20)
  doc.setLineWidth(0.4)
  doc.line(6, y, 74, y)
  y += 4.5

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(180, 20, 20)
  doc.text('TOTAL:', 6, y)
  doc.text(`$${total.toLocaleString('es-CO')}`, 74, y, { align: 'right' })
  y += 6

  // Mensaje de Despedida
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(120, 120, 120)
  doc.text('¡Gracias por tu compra!', 40, y, { align: 'center' })
  y += 3.5
  doc.text('Enchiladitos — Sabor, Chamoy y Fuego', 40, y, { align: 'center' })

  return doc
}

/**
 * Descarga directamente el comprobante en PDF.
 */
export function downloadReceiptPDF(order) {
  const doc = createReceiptPDF(order)
  const safeCustomer = (order.customer_name || 'Cliente').replace(/[^a-zA-Z0-9]/g, '_')
  doc.save(`Comprobante_Enchiladitos_${safeCustomer}.pdf`)
}

/**
 * Comparte el comprobante PDF a WhatsApp usando Web Share API (o descarga el PDF y abre WhatsApp).
 */
export async function shareReceiptPDFToWhatsApp(order) {
  const doc = createReceiptPDF(order)
  const safeCustomer = (order.customer_name || 'Cliente').replace(/[^a-zA-Z0-9]/g, '_')
  const fileName = `Comprobante_Enchiladitos_${safeCustomer}.pdf`
  const blob = doc.output('blob')
  const file = new File([blob], fileName, { type: 'application/pdf' })

  const phone = order.customer_phone ? order.customer_phone.replace(/\D/g, '') : ''
  const companionMessage = `*ENCHILADITOS - COMPROBANTE DE COMPRA*\n¡Hola ${order.customer_name || 'Cliente'}! Adjunto encuentras tu comprobante de compra por valor de $${Number(order.total || 0).toLocaleString('es-CO')}. ¡Muchas gracias por tu preferencia!`

  // Si el navegador soporta compartir archivos nativamente (móviles, Chrome/Safari con WhatsApp)
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'Comprobante de Compra - Enchiladitos',
        text: companionMessage
      })
      return
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.warn('Error sharing file, falling back to download and link', e)
      } else {
        return // Usuario canceló el diálogo
      }
    }
  }

  // Fallback para navegadores de escritorio: Descarga el PDF y abre WhatsApp con el mensaje
  doc.save(fileName)

  const url = phone
    ? `https://wa.me/${phone.startsWith('57') ? phone : '57' + phone}?text=${encodeURIComponent(companionMessage)}`
    : `https://wa.me/?text=${encodeURIComponent(companionMessage)}`

  window.open(url, '_blank')
}
