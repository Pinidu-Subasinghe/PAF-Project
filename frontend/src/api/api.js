const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080').replace(/\/$/, '')

function readErrorMessage(payload, fallbackMessage) {
  if (payload && typeof payload === 'object' && typeof payload.message === 'string') {
    return payload.message
  }

  return fallbackMessage
}

async function request(path, options = {}) {
  const { method = 'GET', body, headers = {} } = options

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(readErrorMessage(payload, 'Request failed. Please try again.'))
  }

  return payload
}

export async function registerUser(registerPayload) {
  return request('/api/v1/auth/register', {
    method: 'POST',
    body: registerPayload,
  })
}

export async function loginUser(loginPayload) {
  return request('/api/v1/auth/login', {
    method: 'POST',
    body: loginPayload,
  })
}
