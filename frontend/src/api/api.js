import { readAuthSession } from '../utils/authSession'

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

function getAuthHeader() {
  const session = readAuthSession()
  if (!session?.token) {
    throw new Error('You must be signed in to perform this action.')
  }

  const tokenType = session.tokenType ?? 'Bearer'
  return { Authorization: `${tokenType} ${session.token}` }
}

export async function requestRegistrationOtp(registerPayload) {
  return request('/api/v1/auth/register', {
    method: 'POST',
    body: registerPayload,
  })
}

export async function verifyRegistrationOtp(verifyPayload) {
  return request('/api/v1/auth/register/verify-otp', {
    method: 'POST',
    body: verifyPayload,
  })
}

export async function loginUser(loginPayload) {
  return request('/api/v1/auth/login', {
    method: 'POST',
    body: loginPayload,
  })
}

export async function updateProfile(updatePayload) {
  return request('/api/v1/users/me', {
    method: 'PUT',
    body: updatePayload,
    headers: getAuthHeader(),
  })
}

export async function deleteProfile() {
  return request('/api/v1/users/me', {
    method: 'DELETE',
    headers: getAuthHeader(),
  })
}

export async function getMyNotifications() {
  return request('/api/v1/notifications/me', {
    headers: getAuthHeader(),
  })
}

export async function markNotificationAsRead(notificationId) {
  return request(`/api/v1/notifications/${notificationId}/read`, {
    method: 'PATCH',
    headers: getAuthHeader(),
  })
}

export async function getResources(filters = {}) {
  const searchParams = new URLSearchParams()

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && `${value}`.trim() !== '') {
      searchParams.set(key, value)
    }
  })

  const query = searchParams.toString()
  return request(`/api/v1/resources${query ? `?${query}` : ''}`)
}

export async function createResource(resourcePayload) {
  return request('/api/v1/resources', {
    method: 'POST',
    body: resourcePayload,
    headers: getAuthHeader(),
  })
}

export async function updateResource(resourceId, resourcePayload) {
  return request(`/api/v1/resources/${resourceId}`, {
    method: 'PUT',
    body: resourcePayload,
    headers: getAuthHeader(),
  })
}

export async function deleteResource(resourceId) {
  return request(`/api/v1/resources/${resourceId}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  })
}
