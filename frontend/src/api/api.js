import { readAuthSession } from '../utils/authSession'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080').replace(/\/$/, '')

class ApiRequestError extends Error {
  constructor(message, field) {
    super(message)
    this.name = 'ApiRequestError'
    this.field = field
  }
}

function readErrorDetails(payload, fallbackMessage) {
  if (payload && typeof payload === 'object') {
    const message = typeof payload.message === 'string' ? payload.message : fallbackMessage
    const field = typeof payload.field === 'string' && payload.field.trim() ? payload.field : null
    return { message, field }
  }

  return { message: fallbackMessage, field: null }
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
    const { message, field } = readErrorDetails(payload, 'Request failed. Please try again.')
    throw new ApiRequestError(message, field)
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

export async function getResourceById(resourceId) {
  return request(`/api/v1/resources/${resourceId}`)
}

function buildResourceFormData(resourcePayload, { coverImage, images, keepImagePublicIds } = {}) {
  const formData = new FormData()
  const dataBlob = new Blob([JSON.stringify(resourcePayload)], { type: 'application/json' })
  formData.append('data', dataBlob)

  if (coverImage) {
    formData.append('coverImage', coverImage)
  }

  if (Array.isArray(images)) {
    images.filter(Boolean).forEach((image) => formData.append('images', image))
  }

  if (Array.isArray(keepImagePublicIds)) {
    keepImagePublicIds
      .filter((publicId) => typeof publicId === 'string' && publicId.trim() !== '')
      .forEach((publicId) => formData.append('keepImagePublicIds', publicId))
  }

  return formData
}

export async function createResource(resourcePayload, options) {
  // send as multipart/form-data (server expects `data` JSON part)
  const formData = buildResourceFormData(resourcePayload, options)

  const headers = getAuthHeader()

  const response = await fetch(`${API_BASE_URL}/api/v1/resources`, {
    method: 'POST',
    headers,
    body: formData,
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const { message, field } = readErrorDetails(payload, 'Request failed. Please try again.')
    throw new ApiRequestError(message, field)
  }

  return payload
}

export async function updateResource(resourceId, resourcePayload, options) {
  const formData = buildResourceFormData(resourcePayload, options)

  const headers = getAuthHeader()

  const response = await fetch(`${API_BASE_URL}/api/v1/resources/${resourceId}`, {
    method: 'PUT',
    headers,
    body: formData,
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const { message, field } = readErrorDetails(payload, 'Request failed. Please try again.')
    throw new ApiRequestError(message, field)
  }

  return payload
}

export async function deleteResource(resourceId) {
  return request(`/api/v1/resources/${resourceId}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  })
}

export async function createBooking(bookingPayload) {
  return request('/api/bookings', {
    method: 'POST',
    body: bookingPayload,
    headers: getAuthHeader(),
  })
}

export async function getMyBookings() {
  return request('/api/bookings/my', {
    headers: getAuthHeader(),
  })
}

export async function getAllBookings(status) {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  return request(`/api/bookings${query}`, {
    headers: getAuthHeader(),
  })
}

export async function approveBooking(bookingId) {
  return request(`/api/bookings/${bookingId}/approve`, {
    method: 'PUT',
    headers: getAuthHeader(),
  })
}

export async function rejectBooking(bookingId, reason) {
  return request(`/api/bookings/${bookingId}/reject`, {
    method: 'PUT',
    body: { reason },
    headers: getAuthHeader(),
  })
}

export async function cancelBooking(bookingId) {
  return request(`/api/bookings/${bookingId}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  })
}

// Admin user management
export async function getAdminUsers() {
  return request('/api/v1/admin/users', {
    headers: getAuthHeader(),
  })
}

export async function createAdminUser(payload) {
  return request('/api/v1/admin/users', {
    method: 'POST',
    body: payload,
    headers: getAuthHeader(),
  })
}

export async function deleteAdminUser(userId) {
  return request(`/api/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  })
}

export async function updateAdminUserRole(userId, payload) {
  return request(`/api/v1/admin/users/${userId}/role`, {
    method: 'PUT',
    body: payload,
    headers: getAuthHeader(),
  })
}
