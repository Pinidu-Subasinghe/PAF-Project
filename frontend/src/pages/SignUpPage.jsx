import { useState } from 'react'
import { registerUser } from '../api/api'
import { writeAuthSession } from '../utils/authSession'

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
      setSuccessMessage(`Account created for ${responseBody?.fullName ?? payload.fullName}.`)
      navigateTo('/')
    } catch (error) {
      setRegisteredUser(null)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to complete registration right now. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="relative overflow-hidden bg-[linear-gradient(160deg,#fff4dd_0%,#f4fbff_48%,#e7f9f2_100%)] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-12 top-8 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_35%_35%,rgba(245,158,11,0.24)_0%,transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-[radial-gradient(circle_at_45%_45%,rgba(20,184,166,0.22)_0%,transparent_72%)]"
      />

      <section className="relative z-10 mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="fade-up rounded-3xl border border-slate-300/40 bg-amber-900 p-6 text-amber-50 shadow-[0_24px_55px_rgba(120,53,15,0.3)] sm:p-8 lg:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">Create Access</p>
          <h1 className="mt-4 font-serif text-3xl leading-tight text-white sm:text-4xl">Join UniPilot today</h1>
          <p className="mt-4 text-sm leading-7 text-amber-100 sm:text-base">
            Set up your account to start managing campus facilities, handling bookings, and tracking incident updates
            in one place.
          </p>

          <ul className="mt-8 space-y-4 text-sm sm:text-base">
            <li className="flex items-start gap-3">
              <span className="mt-2 h-2 w-2 rounded-full bg-cyan-300" />
              <span>Quick onboarding for students, staff, and administrators.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-2 h-2 w-2 rounded-full bg-cyan-300" />
              <span>Role-aware access to booking and maintenance modules.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-2 h-2 w-2 rounded-full bg-cyan-300" />
              <span>Secure credentials aligned with backend validation rules.</span>
            </li>
          </ul>

          <a
            href="/login"
            className="mt-8 inline-flex rounded-full border border-amber-200/50 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-amber-100"
          >
            Already have an account? Login
          </a>
        </article>

        <article className="fade-up fade-up-delay-1 rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.12)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Portal Sign up</p>
          <h2 className="mt-2 font-serif text-3xl text-slate-900 sm:text-4xl">Create your account</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
            Provide your details to register for the Smart Campus Operations Hub.
          </p>

          <form className="mt-6 grid gap-3" onSubmit={handleSubmit} noValidate>
            <label className="text-sm font-semibold text-slate-800" htmlFor="signupFullName">
              Full Name
            </label>
            <input
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-amber-600 focus:ring-4 focus:ring-amber-300/40"
              id="signupFullName"
              name="fullName"
              type="text"
              autoComplete="name"
              value={formValues.fullName}
              onChange={handleChange}
              placeholder="Jane Fernando"
              required
            />

            <label className="mt-1 text-sm font-semibold text-slate-800" htmlFor="signupEmail">
              Email
            </label>
            <input
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-amber-600 focus:ring-4 focus:ring-amber-300/40"
              id="signupEmail"
              name="email"
              type="email"
              autoComplete="email"
              value={formValues.email}
              onChange={handleChange}
              placeholder="jane@example.com"
              required
            />

            <label className="mt-1 text-sm font-semibold text-slate-800" htmlFor="signupPassword">
              Password
            </label>
            <input
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-amber-600 focus:ring-4 focus:ring-amber-300/40"
              id="signupPassword"
              name="password"
              type="password"
              autoComplete="new-password"
              value={formValues.password}
              onChange={handleChange}
              placeholder="At least 8 chars with letters and numbers"
              required
            />

            <button
              className="mt-4 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-amber-700 to-orange-500 px-5 py-3 font-semibold text-amber-50 transition hover:-translate-y-px hover:shadow-lg hover:shadow-amber-900/20 disabled:cursor-not-allowed disabled:opacity-70"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating account...' : 'Create account'}
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

          {registeredUser && (
            <dl className="mt-4 grid gap-2 border-t border-dashed border-amber-900/20 pt-4 text-sm sm:text-base">
              <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
                <dt className="font-semibold text-slate-800">Full name</dt>
                <dd className="text-slate-600">{registeredUser.fullName}</dd>
              </div>
              <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
                <dt className="font-semibold text-slate-800">Email</dt>
                <dd className="text-slate-600">{registeredUser.email}</dd>
              </div>
              <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
                <dt className="font-semibold text-slate-800">Role</dt>
                <dd className="text-slate-600">{registeredUser.role}</dd>
              </div>
            </dl>
          )}
        </article>
      </section>
    </main>
  )
}