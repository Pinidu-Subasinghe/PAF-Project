import { useState } from 'react'
import { loginUser } from '../api/api'

const initialFormState = {
  email: '',
  password: '',
}

function validateForm(formValues) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailPattern.test(formValues.email.trim())) {
    return 'Please enter a valid email address.'
  }

  if (formValues.password.length < 8) {
    return 'Password must be at least 8 characters.'
  }

  return ''
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

export default function LoginForm() {
  const [formValues, setFormValues] = useState(initialFormState)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loginSession, setLoginSession] = useState(null)

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    const validationError = validateForm(formValues)
    if (validationError) {
      setLoginSession(null)
      setErrorMessage(validationError)
      return
    }

    const payload = {
      email: formValues.email.trim(),
      password: formValues.password,
    }

    setIsSubmitting(true)

    try {
      const responseBody = await loginUser(payload)

      setFormValues({
        email: responseBody?.email ?? payload.email,
        password: '',
      })

      setLoginSession({
        email: responseBody?.email ?? payload.email,
        role: responseBody?.role ?? 'USER',
        tokenType: responseBody?.tokenType ?? 'Bearer',
        expiresAt: responseBody?.expiresAt ?? null,
        hasToken: Boolean(responseBody?.token),
      })

      const fullName = responseBody?.fullName?.trim()
      setSuccessMessage(fullName ? `Welcome back, ${fullName}.` : 'Login successful.')
    } catch (error) {
      setLoginSession(null)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to login right now. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <form className="grid gap-3" onSubmit={handleSubmit} noValidate>
        <label className="mt-1 text-sm font-semibold text-stone-800" htmlFor="loginEmail">
          Email
        </label>
        <input
          className="w-full rounded-xl border border-stone-300 bg-sky-50/30 px-3 py-2.5 text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-sky-600 focus:ring-4 focus:ring-sky-300/40"
          id="loginEmail"
          name="email"
          type="email"
          autoComplete="email"
          value={formValues.email}
          onChange={handleChange}
          placeholder="jane@example.com"
          required
        />

        <label className="mt-1 text-sm font-semibold text-stone-800" htmlFor="loginPassword">
          Password
        </label>
        <input
          className="w-full rounded-xl border border-stone-300 bg-sky-50/30 px-3 py-2.5 text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-sky-600 focus:ring-4 focus:ring-sky-300/40"
          id="loginPassword"
          name="password"
          type="password"
          autoComplete="current-password"
          value={formValues.password}
          onChange={handleChange}
          placeholder="Enter your password"
          required
        />

        <button
          className="mt-4 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-700 to-cyan-500 px-5 py-3 font-semibold text-sky-50 transition hover:-translate-y-px hover:shadow-lg hover:shadow-sky-900/20 disabled:cursor-not-allowed disabled:opacity-70"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      {errorMessage && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {errorMessage}
        </p>
      )}

      {successMessage && (
        <p
          className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
          role="status"
        >
          {successMessage}
        </p>
      )}

      {loginSession && (
        <dl className="mt-4 grid gap-2 border-t border-dashed border-sky-900/20 pt-4 text-sm sm:text-base">
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
            <dt className="font-semibold text-stone-800">Email</dt>
            <dd className="text-stone-600">{loginSession.email}</dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
            <dt className="font-semibold text-stone-800">Role</dt>
            <dd className="text-stone-600">{loginSession.role}</dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
            <dt className="font-semibold text-stone-800">Token type</dt>
            <dd className="text-stone-600">{loginSession.tokenType}</dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
            <dt className="font-semibold text-stone-800">Expires at</dt>
            <dd className="text-stone-600">{formatExpiryDate(loginSession.expiresAt)}</dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
            <dt className="font-semibold text-stone-800">Session token</dt>
            <dd className="text-stone-600">{loginSession.hasToken ? 'Received' : 'Unavailable'}</dd>
          </div>
        </dl>
      )}
    </>
  )
}