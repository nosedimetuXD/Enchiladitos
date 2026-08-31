import { jsPDF } from 'jspdf'

let cachedLogoBase64 = null

/**
 * Carga el logo oficial y lo recorta con esquinas redondeadas elegantes para el ticket.
 */
async function getRoundedLogoBase64() {
  if (cachedLogoBase64) return cachedLogoBase64

  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const size = 300
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')

        // Recorte redondeado moderno
        const radius = 60
        ctx.beginPath()
        ctx.moveTo(radius, 0)
        ctx.lineTo(size - radius, 0)
        ctx.quadraticCurveTo(size, 0, size, radius)
        ctx.lineTo(size, size - radius)
        ctx.quadraticCurveTo(size, size, size - radius, size)
        ctx.lineTo(radius, size)
        ctx.quadraticCurveTo(0, size, 0, size - radius)
        ctx.lineTo(0, radius)
        ctx.quadraticCurveTo(0, 0, radius, 0)
        ctx.closePath()
        ctx.clip()

        ctx.drawImage(img, 0, 0, size, size)
        cachedLogoBase64 = canvas.toDataURL('image/png')
        resolve(cachedLogoBase64)
      } catch (err) {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = '/logo.png'
  })
}

/**
 * Genera el documento jsPDF con el diseño estándar oficial e imagen de logo.
 * @param {Object} order - Datos de la venta
 * @returns {Promise<jsPDF>}
 */
export async function createReceiptPDF(order) {
  const items = order.items || []
  const itemsCount = items.length
  // Altura dinámica: base 130mm + espacio por cada producto
  const dynamicHeight = Math.max(160, 115 + itemsCount * 9)

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, dynamicHeight]
  })

  let y = 8

  // 1. Logo Oficial de Enchiladitos (Emblema redondeado)
  try {
    const logoData = await getRoundedLogoBase64()
    if (logoData) {
      // Dibujar logo centrado (22mm x 22mm)
      doc.addImage(logoData, 'PNG', 29, y, 22, 22)
      y += 24
    } else {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.setTextColor(180, 20, 20)
      doc.text('ENCHILADITOS', 40, y + 4, { align: 'center' })
      y += 10
    }
  } catch (e) {
    y += 5
  }

  // 2. Lema y Fecha
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(140, 20, 20)
  doc.text('Sabor, Chamoy y Fuego', 40, y, { align: 'center' })
  y += 3.5

  const dateStr = new Date(order.created_at || Date.now()).toLocaleString('es-CO')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(110, 110, 110)
  doc.text(dateStr, 40, y, { align: 'center' })
  y += 5

  // Línea divisoria
  doc.setDrawColor(210, 210, 210)
  doc.setLineWidth(0.3)
  doc.line(6, y, 74, y)
  y += 4.5

  // 3. Información del Cliente y Método de Pago
  doc.setFontSize(8)
  doc.setTextColor(30, 30, 30)

  doc.setFont('helvetica', 'bold')
  doc.text('Cliente:', 6, y)
  doc.setFont('helvetica', 'normal')
  doc.text(order.customer_name || 'Cliente General', 22, y)
  y += 4

  doc.setFont('helvetica', 'bold')
  doc.text('Pago:', 6, y)
  doc.setFont('helvetica', 'normal')
  doc.text((order.payment_method || 'EFECTIVO').toUpperCase(), 22, y)

  if (order.bank_details) {
    y += 3.5
    doc.setFontSize(6.5)
    doc.setTextColor(90, 90, 90)
    doc.text(`(${order.bank_details})`, 22, y)
  }
  y += 5

  // 4. Tabla de Productos
  doc.setDrawColor(200, 200, 200)
  doc.line(6, y, 74, y)
  y += 3.5

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(60, 60, 60)
  doc.text('Cant.  Producto', 6, y)
  doc.text('Total', 74, y, { align: 'right' })
  y += 2.5

  doc.line(6, y, 74, y)
  y += 4

  // Lista de Productos (Con ajuste de texto para que los nombres no se corten)
  items.forEach((it) => {
    const name = it.product?.name || it.product_name || 'Producto'
    const qty = it.quantity || 1
    const price = it.product?.price || it.unit_price || 0
    const itemTotal = price * qty

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(30, 30, 30)
    doc.text(`${qty}x`, 6, y)

    doc.setFont('helvetica', 'normal')
    const lines = doc.splitTextToSize(name, 45)
    doc.text(lines, 12, y)

    doc.setFont('helvetica', 'bold')
    doc.text(`$${itemTotal.toLocaleString('es-CO')}`, 74, y, { align: 'right' })

    y += Math.max(lines.length * 3.8, 4.5)
  })

  y += 1
  doc.setDrawColor(200, 200, 200)
  doc.line(6, y, 74, y)
  y += 4

  // 5. Subtotal, Descuentos y Total
  const subtotal = order.subtotal || order.total || 0
  const discountAmount = order.discount_amount || 0
  const total = order.total || 0

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(50, 50, 50)
  doc.text('Subtotal:', 6, y)
  doc.text(`$${subtotal.toLocaleString('es-CO')}`, 74, y, { align: 'right' })
  y += 3.5

  if (discountAmount > 0) {
    doc.setTextColor(190, 20, 20)
    const reason = order.discount_reason ? ` (${order.discount_reason})` : ''
    doc.text(`Descuento${reason}:`, 6, y)
    doc.text(`-$${discountAmount.toLocaleString('es-CO')}`, 74, y, { align: 'right' })
    y += 3.5
    doc.setTextColor(50, 50, 50)
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

  // 6. Pie de Página
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(120, 120, 120)
  doc.text('¡Gracias por tu compra!', 40, y, { align: 'center' })
  y += 3.5
  doc.text('Enchiladitos — Sabor, Chamoy y Fuego', 40, y, { align: 'center' })

  return doc
}

/**
 * Descarga el archivo PDF idéntico del comprobante.
 */
export async function downloadReceiptPDF(order) {
  const doc = await createReceiptPDF(order)
  const safeCustomer = (order.customer_name || 'Cliente').replace(/[^a-zA-Z0-9]/g, '_')
  doc.save(`Comprobante_Enchiladitos_${safeCustomer}.pdf`)
}

/**
 * Imprime directamente el comprobante PDF idéntico (sin hojas en blanco).
 */
export async function printReceiptPDF(order) {
  const doc = await createReceiptPDF(order)
  const blobUrl = doc.output('bloburl')

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.bottom = '0'
  iframe.style.right = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = 'none'
  iframe.src = blobUrl
  document.body.appendChild(iframe)

  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => {
        try {
          document.body.removeChild(iframe)
          URL.revokeObjectURL(blobUrl)
        } catch (e) {}
      }, 60000)
    }, 300)
  }
}

/**
 * Comparte el archivo PDF idéntico a WhatsApp (o descarga y abre WhatsApp con el mensaje).
 */
export async function shareReceiptPDFToWhatsApp(order) {
  const doc = await createReceiptPDF(order)
  const safeCustomer = (order.customer_name || 'Cliente').replace(/[^a-zA-Z0-9]/g, '_')
  const fileName = `Comprobante_Enchiladitos_${safeCustomer}.pdf`
  const blob = doc.output('blob')
  const file = new File([blob], fileName, { type: 'application/pdf' })

  const phone = order.customer_phone ? order.customer_phone.replace(/\D/g, '') : ''
  const companionMessage = `*ENCHILADITOS - COMPROBANTE DE COMPRA*\n¡Hola ${order.customer_name || 'Cliente'}! Adjunto encuentras tu comprobante de compra por valor de $${Number(order.total || 0).toLocaleString('es-CO')}. ¡Muchas gracias por tu preferencia!`

  // Si el navegador soporta compartir archivos nativamente a WhatsApp (móviles y apps de escritorio)
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
        console.warn('Error sharing file, fallback to download', e)
      } else {
        return
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
