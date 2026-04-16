import { useEffect, useState } from 'react'
import { registerUser } from '../api/api'
import { writeAuthSession } from '../utils/authSession'
import { startGoogleOAuth } from '../utils/googleOAuth'

const initialFormState = {
  fullName: '',
  email: '',
  password: '',
}

function validateForm(formValues) {
  if (formValues.fullName.trim().length < 2) {
    return 'Full name must be at least 2 characters.'
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailPattern.test(formValues.email.trim())) {
    return 'Please enter a valid email address.'
  }

  const password = formValues.password
  if (password.length < 8) {
    return 'Password must be at least 8 characters.'
  }

  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Password must include at least one letter and one number.'
  }

  return ''
}

function navigateTo(pathname) {
  window.history.pushState(null, '', pathname)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export default function SignUpPage() {
  const [formValues, setFormValues] = useState(initialFormState)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [registeredUser, setRegisteredUser] = useState(null)

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search)
    const oauthError = queryParams.get('error')

    if (oauthError) {
      setErrorMessage('Google sign-up failed. Please try again.')
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    const validationError = validateForm(formValues)
    if (validationError) {
      setRegisteredUser(null)
      setErrorMessage(validationError)
      return
    }

    const payload = {
      fullName: formValues.fullName.trim(),
      email: formValues.email.trim(),
      password: formValues.password,
    }

    setIsSubmitting(true)

    try {
      const responseBody = await registerUser(payload)

      const nextSession = {
        id: responseBody?.id ?? null,
        fullName: responseBody?.fullName ?? payload.fullName,
        email: responseBody?.email ?? payload.email,
        role: responseBody?.role ?? 'USER',
        tokenType: null,
        expiresAt: null,
        token: null,
        passwordSetupRequired: false,
      }

      writeAuthSession(nextSession)

      setFormValues(initialFormState)
      setRegisteredUser({
        id: nextSession.id,
        fullName: nextSession.fullName,
        email: nextSession.email,
        role: nextSession.role,
        createdAt: responseBody?.createdAt ?? null,
      })

      setSuccessMessage(`Account created for ${nextSession.fullName}.`)
      navigateTo('/')
    } catch (error) {
      setRegisteredUser(null)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to complete registration right now. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-0">
      <div className="w-full max-w-md space-y-4">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-slate-900">UniPilot</h1>
          <p className="mt-2 text-sm text-slate-500">
            Create your account to continue
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            
            <input
              name="fullName"
              type="text"
              placeholder="Full name"
              value={formValues.fullName}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              required
            />

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
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 py-2">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs text-slate-400">OR</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            {/* Google */}
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

          {/* Messages */}
          {errorMessage && (
            <p className="mt-4 text-sm text-red-600">{errorMessage}</p>
          )}

          {successMessage && (
            <p className="mt-4 text-sm text-green-600">{successMessage}</p>
          )}

          {registeredUser && (
            <div className="mt-4 text-sm text-slate-600">
              <p><strong>Name:</strong> {registeredUser.fullName}</p>
              <p><strong>Email:</strong> {registeredUser.email}</p>
              <p><strong>Role:</strong> {registeredUser.role}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-slate-500">
          Already have an account?{" "}
          <a href="/login" className="font-medium text-slate-900 hover:underline">
            Login
          </a>
        </p>
      </div>
    </main>
  )
}