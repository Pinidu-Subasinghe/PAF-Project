import { useState } from 'react'
import { updateProfile } from '../../api/api'
import { writeAuthSession } from '../../utils/authSession'

function validatePassword(password) {
  if (password.length < 8) {
    return 'Password must be at least 8 characters.'
  }

  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Password must include at least one letter and one number.'
  }

  return ''
}

export default function ChangePassword({ session }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusType, setStatusType] = useState('')

  if (!session) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <h2 className="text-lg font-semibold text-slate-900">Change Password</h2>
        <p className="mt-2 text-sm text-slate-600">Sign in to update your password.</p>
      </div>
    )
  }

  const requiresPasswordSetup = Boolean(session.passwordSetupRequired)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatusMessage('')
    setStatusType('')

    const trimmedCurrentPassword = currentPassword.trim()
    if (!requiresPasswordSetup && !trimmedCurrentPassword) {
      setStatusType('error')
      setStatusMessage('Current password is required to change your password.')
      return
    }

    const trimmedPassword = newPassword.trim()
    const validationMessage = validatePassword(trimmedPassword)
    if (validationMessage) {
      setStatusType('error')
      setStatusMessage(validationMessage)
      return
    }

    if (trimmedPassword !== confirmPassword.trim()) {
      setStatusType('error')
      setStatusMessage('Password and confirm password do not match.')
      return
    }

    const resolvedFullName = session.fullName?.trim() || session.email?.split('@')[0] || 'Campus User'
    const resolvedEmail = session.email?.trim()

    if (!resolvedEmail) {
      setStatusType('error')
      setStatusMessage('Unable to resolve account email for password update.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await updateProfile({
        fullName: resolvedFullName,
        email: resolvedEmail,
        ...(!requiresPasswordSetup ? { currentPassword: trimmedCurrentPassword } : {}),
        newPassword: trimmedPassword,
      })

      const nextSession = {
        token: response?.token ?? session.token ?? null,
        tokenType: response?.tokenType ?? session.tokenType ?? 'Bearer',
        expiresAt: response?.expiresAt ?? session.expiresAt ?? null,
        email: response?.email ?? resolvedEmail,
        fullName: response?.fullName ?? resolvedFullName,
        role: response?.role ?? session.role ?? 'USER',
        passwordSetupRequired: response?.passwordSetupRequired ?? false,
      }

      writeAuthSession(nextSession)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setStatusType('success')
      setStatusMessage(requiresPasswordSetup ? 'Password set successfully.' : 'Password updated successfully.')
    } catch (error) {
      setStatusType('error')
      setStatusMessage(
        error instanceof Error
          ? error.message
          : 'Unable to update password right now.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Change Password</h2>
        <p className="mt-1 text-sm text-slate-500">Update your account password securely.</p>
      </div>

      {requiresPasswordSetup && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-semibold text-red-700">Password setup required</p>
          <p className="mt-1 text-sm text-red-600">
            Your account was created with Google. Please create a password now.
          </p>
        </div>
      )}

      <form className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          {!requiresPasswordSetup && (
            <label className="text-sm font-semibold text-slate-700" htmlFor="currentPasswordInput">
              Current password
              <input
                id="currentPasswordInput"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900"
                placeholder="Enter current password"
                required
              />
            </label>
          )}

          <label className="text-sm font-semibold text-slate-700" htmlFor="newPasswordInput">
            New password
            <input
              id="newPasswordInput"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900"
              placeholder="At least 8 characters"
              required
            />
          </label>

          <label className="text-sm font-semibold text-slate-700" htmlFor="confirmPasswordInput">
            Confirm password
            <input
              id="confirmPasswordInput"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900"
              placeholder="Re-enter password"
              required
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Updating...' : requiresPasswordSetup ? 'Set password' : 'Update password'}
        </button>
      </form>

      {statusMessage && (
        <p className={`text-sm ${statusType === 'error' ? 'text-red-600' : 'text-green-600'}`}>
          {statusMessage}
        </p>
      )}
    </div>
  )
}
