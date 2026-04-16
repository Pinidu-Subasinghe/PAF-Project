import { useState } from 'react'
import { loginUser } from '../api/api'
import { writeAuthSession } from '../utils/authSession'

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
    <main className="relative overflow-hidden bg-[linear-gradient(165deg,#f9fbff_0%,#e9f7f5_45%,#fff4dd_100%)] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 top-14 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_35%_35%,rgba(20,184,166,0.22)_0%,transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 right-0 h-80 w-80 rounded-full bg-[radial-gradient(circle_at_45%_45%,rgba(245,158,11,0.2)_0%,transparent_70%)]"
      />

      <section className="relative z-10 mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="fade-up rounded-3xl border border-slate-300/40 bg-slate-900 p-6 text-slate-100 shadow-[0_24px_55px_rgba(15,23,42,0.26)] sm:p-8 lg:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Secure Access</p>
          <h1 className="mt-4 font-serif text-3xl leading-tight text-white sm:text-4xl">Welcome back to UniPilot</h1>
          <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
            Login to continue with Smart Campus Operations Hub and manage facilities, bookings, and maintenance
            workflows from one portal.
          </p>

          <ul className="mt-8 space-y-4 text-sm sm:text-base">
            <li className="flex items-start gap-3">
              <span className="mt-2 h-2 w-2 rounded-full bg-amber-300" />
              <span>Role-based access for USER and ADMIN workflows.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-2 h-2 w-2 rounded-full bg-amber-300" />
              <span>Real-time booking, ticket, and notification visibility.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-2 h-2 w-2 rounded-full bg-amber-300" />
              <span>Consistent audit-ready operations across the platform.</span>
            </li>
          </ul>

          <a
            href="/#modules"
            className="mt-8 inline-flex rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white/60"
          >
            Explore Platform Modules
          </a>
        </article>

        <article className="fade-up fade-up-delay-1 rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.12)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Portal Login</p>
          <h2 className="mt-2 font-serif text-3xl text-slate-900 sm:text-4xl">Sign in to your account</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
            Enter your credentials to access your dashboard and continue your campus operations.
          </p>

          <form className="mt-6 grid gap-3" onSubmit={handleSubmit} noValidate>
            <label className="text-sm font-semibold text-slate-800" htmlFor="loginEmail">
              Email
            </label>
            <input
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-300/40"
              id="loginEmail"
              name="email"
              type="email"
              autoComplete="email"
              value={formValues.email}
              onChange={handleChange}
              placeholder="jane@example.com"
              required
            />

            <label className="mt-1 text-sm font-semibold text-slate-800" htmlFor="loginPassword">
              Password
            </label>
            <input
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-300/40"
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
              className="mt-4 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-teal-700 to-cyan-600 px-5 py-3 font-semibold text-teal-50 transition hover:-translate-y-px hover:shadow-lg hover:shadow-teal-900/20 disabled:cursor-not-allowed disabled:opacity-70"
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
            <dl className="mt-4 grid gap-2 border-t border-dashed border-teal-900/20 pt-4 text-sm sm:text-base">
              <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
                <dt className="font-semibold text-slate-800">Email</dt>
                <dd className="text-slate-600">{loginSession.email}</dd>
              </div>
              <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
                <dt className="font-semibold text-slate-800">Role</dt>
                <dd className="text-slate-600">{loginSession.role}</dd>
              </div>
              <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
                <dt className="font-semibold text-slate-800">Token type</dt>
                <dd className="text-slate-600">{loginSession.tokenType}</dd>
              </div>
              <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
                <dt className="font-semibold text-slate-800">Expires at</dt>
                <dd className="text-slate-600">{formatExpiryDate(loginSession.expiresAt)}</dd>
              </div>
              <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
                <dt className="font-semibold text-slate-800">Session token</dt>
                <dd className="text-slate-600">{loginSession.hasToken ? 'Received' : 'Unavailable'}</dd>
              </div>
            </dl>
          )}
        </article>
      </section>
    </main>
  )
}