import { writeAuthSession } from './authSession'

const BACKEND_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080').replace(/\/$/, '')

export const GOOGLE_OAUTH_START_URL = `${BACKEND_BASE_URL}/oauth2/authorization/google`

export function startGoogleOAuth() {
  window.location.href = GOOGLE_OAUTH_START_URL
}

export function consumeGoogleOAuthRedirect() {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const token = hashParams.get('token')

  if (token) {
    const nextSession = {
      token,
      tokenType: hashParams.get('tokenType') ?? 'Bearer',
      expiresAt: hashParams.get('expiresAt'),
      email: hashParams.get('email'),
      fullName: hashParams.get('fullName'),
      role: hashParams.get('role') ?? 'USER',
    }

    writeAuthSession(nextSession)
    window.history.replaceState(null, '', window.location.pathname)

    return { status: 'success' }
  }

  const queryParams = new URLSearchParams(window.location.search)
  const oauthError = queryParams.get('error')

  if (oauthError) {
    window.history.replaceState(null, '', window.location.pathname)
    return { status: 'error', error: oauthError }
  }

  return { status: 'none' }
}