const API_URL = 'http://localhost:8080'

function getToken() {
    return localStorage.getItem('token')
}

async function request(path, options = {}) {
    const token = getToken()

    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers
        }
    })

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || `Error ${response.status}`)
    }

    if (response.status === 204) return null
    return response.json()
}

export const api = {
    get: (path) => request(path),
    post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
    put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
    patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (path) => request(path, { method: 'DELETE' })
}