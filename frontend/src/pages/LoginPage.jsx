import { useEffect, useState } from 'react'
import { loginUser } from '../api/api'
import { writeAuthSession } from '../utils/authSession'
import { startGoogleOAuth } from '../utils/googleOAuth'

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
    const queryParams = new URLSearchParams(window.location.search)
    const oauthError = queryParams.get('error')

    if (oauthError) {
      setErrorMessage('Google sign-in failed. Please try again.')
      window.history.replaceState(null, '', window.location.pathname)
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
        passwordSetupRequired: responseBody?.passwordSetupRequired ?? false,
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
                <path fill="#EA4335" d="M24 9.5c3.2 0 6.1 1.1 8.4 3.2l6.3-6.3C34.5 2.6 29.6 0 24 0 14.6 0 6.6 5.5 2.7 13.5l7.4 5.8C12.1 13.1 17.6 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.5 24.5c0-1.7-.2-3.3-.5-4.9H24v9.3h12.6c-.5 2.9-2.2 5.4-4.7 7.1l7.3 5.7c4.3-4 7.3-9.9 7.3-17.2z"/>
                <path fill="#FBBC05" d="M10.1 28.3c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.4-5.8C1 16.2 0 19.9 0 23.7s1 7.5 2.7 10.4l7.4-5.8z"/>
                <path fill="#34A853" d="M24 47c6.5 0 11.9-2.1 15.9-5.7l-7.3-5.7c-2 1.3-4.6 2.1-8.6 2.1-6.4 0-11.9-3.6-13.9-8.8l-7.4 5.8C6.6 41.5 14.6 47 24 47z"/>
              </svg>
              Sign in with Google
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