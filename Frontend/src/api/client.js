export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/+$/, '')

function getToken() {
  return localStorage.getItem('token')
}

// Timeout helper con AbortController
async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(timeoutId)
    return res
  } catch (err) {
    clearTimeout(timeoutId)
    throw err
  }
}

// Petición HTTP resiliente con reintento automático (para caídas momentáneas y reactivación de Render)
async function request(path, options = {}, retries = 3, delayMs = 800) {
  const token = getToken()
  const isGet = !options.method || options.method === 'GET'

  try {
    const response = await fetchWithTimeout(
      `${API_URL}${path}`,
      {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers
        }
      },
      isGet ? 20000 : 35000 // 20s para lecturas, 35s para escrituras
    )

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }

      // Si el servidor está despertando de suspensión (502, 503, 504) y quedan reintentos
      if (response.status >= 502 && response.status <= 504 && retries > 0 && isGet) {
        await new Promise((r) => setTimeout(r, delayMs))
        return request(path, options, retries - 1, delayMs * 1.5)
      }

      const errorText = await response.text()
      throw new Error(errorText || `Error ${response.status}`)
    }

    if (response.status === 204) return null
    return response.json()
  } catch (err) {
    // Si es error de red o timeout mientras Render despierta
    if (retries > 0 && isGet && (err.name === 'AbortError' || err.message?.includes('fetch') || err.message?.includes('network') || err.message?.includes('Failed'))) {
      await new Promise((r) => setTimeout(r, delayMs))
      return request(path, options, retries - 1, delayMs * 1.5)
    }
    throw err
  }
}

// Keep-Alive / Heartbeat automático: Mantiene activo el servidor de Render mientras la pestaña esté abierta
let keepAliveInterval = null

export function startKeepAlive() {
  if (keepAliveInterval) return

  const ping = () => {
    if (getToken() && document.visibilityState === 'visible') {
      fetch(`${API_URL}/health`, { method: 'GET', keepalive: true }).catch(() => {})
    }
  }

  // Ping cada 3.5 minutos para evitar que Render entre en reposo (duerme a los 15 min de inactividad)
  keepAliveInterval = setInterval(ping, 3.5 * 60 * 1000)

  // Despertar inmediato cuando el usuario vuelve a enfocar la pestaña
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        ping()
      }
    })
    window.addEventListener('focus', () => {
      ping()
    })
  }
}

// Iniciar Keep-Alive de inmediato al cargar la app
startKeepAlive()

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' })
}