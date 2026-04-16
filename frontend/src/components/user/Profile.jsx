import { useEffect, useMemo, useState } from 'react'
import { HiPencilSquare } from 'react-icons/hi2'
import { deleteProfile, updateProfile } from '../../api/api'
import {
  authSessionChangeEvent,
  clearAuthSession,
  readAuthSession,
  writeAuthSession,
} from '../../utils/authSession'

const initialFormState = {
  fullName: '',
  email: '',
  newPassword: '',
  confirmPassword: '',
}

const initialEditableState = {
  fullName: false,
  email: false,
}

function isValidEmail(email) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailPattern.test(email)
}

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
  const [formValues, setFormValues] = useState(initialFormState)
  const [editableFields, setEditableFields] = useState(initialEditableState)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusType, setStatusType] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

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

  useEffect(() => {
    if (!activeSession) {
      return
    }

    setFormValues({
      fullName: activeSession.fullName ?? '',
      email: activeSession.email ?? '',
      newPassword: '',
      confirmPassword: '',
    })
    setEditableFields(initialEditableState)
  }, [activeSession?.fullName, activeSession?.email])

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

  const role = activeSession.role ?? 'USER'
  const expiresAt = formatExpiryDate(activeSession.expiresAt)
  const requiresPasswordSetup = Boolean(activeSession.passwordSetupRequired)
  const hasPasswordInput = Boolean(formValues.newPassword.trim() || formValues.confirmPassword.trim())

  const hasProfileChanges = useMemo(() => {
    const currentName = (activeSession.fullName ?? '').trim()
    const currentEmail = (activeSession.email ?? '').trim().toLowerCase()
    const nextName = formValues.fullName.trim()
    const nextEmail = formValues.email.trim().toLowerCase()

    return currentName !== nextName || currentEmail !== nextEmail
  }, [activeSession.email, activeSession.fullName, formValues.email, formValues.fullName])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleEnableEdit = (fieldName) => {
    setEditableFields((prev) => ({
      ...prev,
      [fieldName]: true,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatusMessage('')
    setStatusType('')

    const trimmedName = formValues.fullName.trim()
    if (trimmedName.length < 2) {
      setStatusType('error')
      setStatusMessage('Full name must be at least 2 characters.')
      return
    }

    const trimmedEmail = formValues.email.trim()
    if (!isValidEmail(trimmedEmail)) {
      setStatusType('error')
      setStatusMessage('Please enter a valid email address.')
      return
    }

    if (requiresPasswordSetup) {
      if (!formValues.newPassword.trim() || !formValues.confirmPassword.trim()) {
        setStatusType('error')
        setStatusMessage('Google users must create a password before continuing.')
        return
      }

      if (formValues.newPassword.length < 8) {
        setStatusType('error')
        setStatusMessage('New password must be at least 8 characters.')
        return
      }

      if (!/[A-Za-z]/.test(formValues.newPassword) || !/\d/.test(formValues.newPassword)) {
        setStatusType('error')
        setStatusMessage('New password must include at least one letter and one number.')
        return
      }

      if (formValues.newPassword !== formValues.confirmPassword) {
        setStatusType('error')
        setStatusMessage('Password and confirm password do not match.')
        return
      }
    }

    if (!hasProfileChanges && !(requiresPasswordSetup && hasPasswordInput)) {
      setStatusType('error')
      setStatusMessage('No changes to update.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await updateProfile({
        fullName: trimmedName,
        email: trimmedEmail,
        ...(requiresPasswordSetup ? { newPassword: formValues.newPassword } : {}),
      })

      const nextSession = {
        token: response?.token ?? activeSession.token ?? null,
        tokenType: response?.tokenType ?? activeSession.tokenType ?? 'Bearer',
        expiresAt: response?.expiresAt ?? activeSession.expiresAt ?? null,
        email: response?.email ?? trimmedEmail,
        fullName: response?.fullName ?? trimmedName,
        role: response?.role ?? activeSession.role ?? 'USER',
        passwordSetupRequired: response?.passwordSetupRequired ?? false,
      }

      writeAuthSession(nextSession)
      setLocalSession(nextSession)
      setFormValues((prev) => ({
        ...prev,
        newPassword: '',
        confirmPassword: '',
      }))
      setEditableFields(initialEditableState)
      setStatusType('success')
      setStatusMessage('Profile updated successfully.')
    } catch (error) {
      setStatusType('error')
      setStatusMessage(
        error instanceof Error
          ? error.message
          : 'Unable to update profile right now.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    setStatusMessage('')
    setStatusType('')

    const shouldDelete = window.confirm('Are you sure you want to delete your profile? This cannot be undone.')
    if (!shouldDelete) {
      return
    }

    setIsDeleting(true)

    try {
      await deleteProfile()
      clearAuthSession()
      setLocalSession(null)
      window.location.href = '/'
    } catch (error) {
      setStatusType('error')
      setStatusMessage(
        error instanceof Error
          ? error.message
          : 'Unable to delete profile right now.'
      )
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Profile</h2>
        <p className="mt-1 text-sm text-slate-500">Click the pen icon to edit a field, then press Update profile.</p>
      </div>

      <form className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700" htmlFor="profileFullName">
            Full name
            <div className="relative mt-1">
              <input
                id="profileFullName"
                name="fullName"
                type="text"
                value={formValues.fullName}
                onChange={handleChange}
                disabled={!editableFields.fullName}
                className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm outline-none ${
                  editableFields.fullName
                    ? 'border-slate-400 bg-white focus:border-slate-900'
                    : 'border-slate-300 bg-slate-100 text-slate-700'
                }`}
                required
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-600 transition hover:bg-slate-200 hover:text-slate-900"
                onClick={() => handleEnableEdit('fullName')}
                aria-label="Edit full name"
                title="Edit full name"
              >
                <HiPencilSquare className="h-4 w-4" />
              </button>
            </div>
          </label>

          <label className="text-sm font-semibold text-slate-700" htmlFor="profileEmail">
            Email
            <div className="relative mt-1">
              <input
                id="profileEmail"
                name="email"
                type="email"
                value={formValues.email}
                onChange={handleChange}
                disabled={!editableFields.email}
                className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm outline-none ${
                  editableFields.email
                    ? 'border-slate-400 bg-white focus:border-slate-900'
                    : 'border-slate-300 bg-slate-100 text-slate-700'
                }`}
                required
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-600 transition hover:bg-slate-200 hover:text-slate-900"
                onClick={() => handleEnableEdit('email')}
                aria-label="Edit email"
                title="Edit email"
              >
                <HiPencilSquare className="h-4 w-4" />
              </button>
            </div>
          </label>
        </div>

        {requiresPasswordSetup && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-sm font-semibold text-red-700">Password setup required</p>
            <p className="mt-1 text-sm text-red-600">
              Your account was created with Google. Create a password to complete your profile.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold text-red-700" htmlFor="profileNewPassword">
                New password
                <input
                  id="profileNewPassword"
                  name="newPassword"
                  type="password"
                  value={formValues.newPassword}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-500"
                  placeholder="At least 8 characters"
                />
              </label>
              <label className="text-sm font-semibold text-red-700" htmlFor="profileConfirmPassword">
                Confirm password
                <input
                  id="profileConfirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formValues.confirmPassword}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-500"
                  placeholder="Re-enter password"
                />
              </label>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || (!hasProfileChanges && !requiresPasswordSetup)}
          className="inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Updating...' : 'Update profile'}
        </button>
      </form>

      {statusMessage && (
        <p className={`text-sm ${statusType === 'error' ? 'text-red-600' : 'text-green-600'}`}>
          {statusMessage}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Role</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{role}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Session expires</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{expiresAt}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
        <h3 className="text-sm font-semibold text-red-700">Delete profile</h3>
        <p className="mt-1 text-sm text-red-600">
          This will permanently remove your account and data.
        </p>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="mt-4 inline-flex items-center justify-center rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:border-red-400 hover:text-red-800 disabled:opacity-60"
        >
          {isDeleting ? 'Deleting...' : 'Delete profile'}
        </button>
      </div>
    </div>
  )
}
