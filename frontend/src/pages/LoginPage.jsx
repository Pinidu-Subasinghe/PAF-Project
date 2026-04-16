import { useEffect, useState } from 'react'
import { loginUser } from '../api/api'
import { writeAuthSession } from '../utils/authSession'
import { consumeGoogleOAuthRedirect, startGoogleOAuth } from '../utils/googleOAuth'

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

function navigateTo(pathname) {
  window.history.pushState(null, '', pathname)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export default function LoginPage() {
  const [formValues, setFormValues] = useState(initialFormState)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loginSession, setLoginSession] = useState(null)

  useEffect(() => {
    const oauthResult = consumeGoogleOAuthRedirect()

    if (oauthResult.status === 'success') {
      navigateTo('/')
      return
    }

    if (oauthResult.status === 'error') {
      setErrorMessage('Google sign-in failed. Please try again.')
    }
  }, [])

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

      const nextSession = {
        email: responseBody?.email ?? payload.email,
        fullName: responseBody?.fullName?.trim() || null,
        role: responseBody?.role ?? 'USER',
        tokenType: responseBody?.tokenType ?? 'Bearer',
        expiresAt: responseBody?.expiresAt ?? null,
        token: responseBody?.token ?? null,
      }

      writeAuthSession(nextSession)

      setFormValues({
        email: nextSession.email,
        password: '',
      })

      setLoginSession({
        email: nextSession.email,
        role: nextSession.role,
        tokenType: nextSession.tokenType,
        expiresAt: nextSession.expiresAt,
        hasToken: Boolean(nextSession.token),
      })

      const fullName = responseBody?.fullName?.trim()
      setSuccessMessage(fullName ? `Welcome back, ${fullName}.` : 'Login successful.')
      navigateTo('/')
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
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-0">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-slate-900">UniPilot</h1>
          <p className="mt-2 text-sm text-slate-500">
            Sign in to continue
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <input
              name="email"
              type="email"
              placeholder="Email address"
              value={formValues.email}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              required
            />

            <input
              name="password"
              type="password"
              placeholder="Password"
              value={formValues.password}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              required
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>

            <div className="flex items-center gap-3 py-2">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs text-slate-400">OR</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <button
              type="button"
              onClick={startGoogleOAuth}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-300 py-2.5 text-sm font-medium hover:bg-slate-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 20.5H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
              </svg>
              Continue with Google
            </button>
          </form>

          {errorMessage && (
            <p className="mt-4 text-sm text-red-600">{errorMessage}</p>
          )}

          {successMessage && (
            <p className="mt-4 text-sm text-green-600">{successMessage}</p>
          )}

          {loginSession && (
            <div className="mt-4 text-sm text-slate-600">
              <p><strong>Email:</strong> {loginSession.email}</p>
              <p><strong>Role:</strong> {loginSession.role}</p>
              <p><strong>Token type:</strong> {loginSession.tokenType}</p>
              <p><strong>Expires at:</strong> {formatExpiryDate(loginSession.expiresAt)}</p>
              <p><strong>Session token:</strong> {loginSession.hasToken ? 'Received' : 'Unavailable'}</p>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-slate-500">
          Don&apos;t have an account?{' '}
          <a href="/signup" className="font-medium text-slate-900 hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </main>
  )
}