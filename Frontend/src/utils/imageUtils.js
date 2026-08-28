// Utilidades para manejo de imágenes de avatar y conversión de enlaces (ej. Google Drive)

export function processImageUrl(rawUrl) {
  if (!rawUrl) return ''
  const str = rawUrl.trim()

  // Detectar enlaces compartidos de Google Drive (ej. /file/d/ID/view o ?id=ID)
  const driveMatch = str.match(/\/file\/d\/([^\/]+)/) || str.match(/[\?&]id=([^&]+)/)
  if (driveMatch && driveMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`
  }

  return str
}

/**
 * Lee y comprime una imagen seleccionada desde el dispositivo manteniendo máxima nitidez y alta definición (HD).
 */
export function compressAndReadFile(file, callback, options = {}) {
  if (!file) return
  const reader = new FileReader()
  reader.onload = (event) => {
    const img = new Image()
    img.onload = () => {
      // Resolución máxima optimizada (800px para máxima definición HD en pantallas móviles y 4K)
      const MAX_WIDTH = options.maxWidth || 800
      const MAX_HEIGHT = options.maxHeight || 800
      let width = img.width
      let height = img.height

      if (width > height) {
        if (width > MAX_WIDTH) {
          height = Math.round(height * (MAX_WIDTH / width))
          width = MAX_WIDTH
        }
      } else {
        if (height > MAX_HEIGHT) {
          width = Math.round(width * (MAX_HEIGHT / height))
          height = MAX_HEIGHT
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      // Habilitar máxima calidad de suavizado y nitidez de renderizado en Canvas
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      ctx.drawImage(img, 0, 0, width, height)

      // Formato WebP o JPEG 92% para conservar nitidez impecable
      let compressedDataUrl
      try {
        compressedDataUrl = canvas.toDataURL('image/webp', 0.90)
        if (!compressedDataUrl.startsWith('data:image/webp')) {
          compressedDataUrl = canvas.toDataURL('image/jpeg', 0.92)
        }
      } catch (e) {
        compressedDataUrl = canvas.toDataURL('image/jpeg', 0.92)
      }

      callback(compressedDataUrl)
    }
    img.src = event.target.result
  }
  reader.readAsDataURL(file)
}
