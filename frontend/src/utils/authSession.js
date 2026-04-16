const AUTH_SESSION_KEY = 'unipilot.auth.session'
const AUTH_CHANGE_EVENT = 'unipilot-auth-change'

export function readAuthSession() {
  try {
    const rawSession = window.localStorage.getItem(AUTH_SESSION_KEY)
    if (!rawSession) {
      return null
    }

    const parsedSession = JSON.parse(rawSession)
    return parsedSession && typeof parsedSession === 'object' ? parsedSession : null
  } catch {
    window.localStorage.removeItem(AUTH_SESSION_KEY)
    return null
  }
}

export function writeAuthSession(sessionPayload) {
  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(sessionPayload))
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT))
}

export function clearAuthSession() {
  window.localStorage.removeItem(AUTH_SESSION_KEY)
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT))
}

export const authSessionChangeEvent = AUTH_CHANGE_EVENT