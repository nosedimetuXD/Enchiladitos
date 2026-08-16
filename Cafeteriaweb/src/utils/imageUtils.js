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

export function compressAndReadFile(file, callback) {
  if (!file) return
  const reader = new FileReader()
  reader.onload = (event) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const MAX_WIDTH = 300
      const MAX_HEIGHT = 300
      let width = img.width
      let height = img.height

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width
          width = MAX_WIDTH
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height
          height = MAX_HEIGHT
        }
      }

      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85)
      callback(compressedDataUrl)
    }
    img.src = event.target.result
  }
  reader.readAsDataURL(file)
}
