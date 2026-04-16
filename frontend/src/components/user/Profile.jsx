import { useEffect, useState } from 'react'
import { authSessionChangeEvent, readAuthSession } from '../../utils/authSession'

function formatExpiryDate(expiresAt) {
  if (!expiresAt) {
    return 'Not provided'
  }

  const parsedDate = new Date(expiresAt)
  if (Number.isNaN(parsedDate.getTime())) {
    return expiresAt
  }

  return parsedDate.toLocaleString()
}

export default function Profile({ session }) {
  const [localSession, setLocalSession] = useState(() => readAuthSession())

  useEffect(() => {
    if (session !== undefined) {
      setLocalSession(session)
      return
    }

    const syncSession = () => {
      setLocalSession(readAuthSession())
    }

    window.addEventListener('storage', syncSession)
    window.addEventListener(authSessionChangeEvent, syncSession)

    return () => {
      window.removeEventListener('storage', syncSession)
      window.removeEventListener(authSessionChangeEvent, syncSession)
    }
  }, [session])

  const activeSession = session ?? localSession

  if (!activeSession) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <h2 className="text-lg font-semibold text-slate-900">Profile</h2>
        <p className="mt-2 text-sm text-slate-600">
          You are not signed in. Log in to view your profile details.
        </p>
        <a
          href="/login"
          className="mt-4 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Go to login
        </a>
      </div>
    )
  }

  const displayName = activeSession.fullName?.trim() || activeSession.email || 'Campus User'
  const role = activeSession.role ?? 'USER'
  const tokenType = activeSession.tokenType ?? 'Not provided'
  const expiresAt = formatExpiryDate(activeSession.expiresAt)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Profile</h2>
        <p className="mt-1 text-sm text-slate-500">Your account details and session status.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Name</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{displayName}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Email</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{activeSession.email ?? 'Not provided'}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Role</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{role}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Token type</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{tokenType}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Session expires</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{expiresAt}</p>
        </div>
      </div>
    </div>
  )
}
