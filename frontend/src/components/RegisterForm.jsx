import { useState } from 'react'
import { registerUser } from '../api/api'

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

export default function RegisterForm() {
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

      setFormValues(initialFormState)
      setRegisteredUser({
        email: responseBody?.email ?? payload.email,
        role: responseBody?.role ?? 'USER',
      })
      setSuccessMessage(`Account created for ${responseBody?.fullName ?? payload.fullName}.`)
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
    <>
      <form className="grid gap-3" onSubmit={handleSubmit} noValidate>
        <label className="mt-1 text-sm font-semibold text-stone-800" htmlFor="fullName">
          Full Name
        </label>
        <input
          className="w-full rounded-xl border border-stone-300 bg-amber-50/40 px-3 py-2.5 text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-amber-600 focus:ring-4 focus:ring-amber-300/40"
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          value={formValues.fullName}
          onChange={handleChange}
          placeholder="Jane Fernando"
          required
        />

        <label className="mt-1 text-sm font-semibold text-stone-800" htmlFor="email">
          Email
        </label>
        <input
          className="w-full rounded-xl border border-stone-300 bg-amber-50/40 px-3 py-2.5 text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-amber-600 focus:ring-4 focus:ring-amber-300/40"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={formValues.email}
          onChange={handleChange}
          placeholder="jane@example.com"
          required
        />

        <label className="mt-1 text-sm font-semibold text-stone-800" htmlFor="password">
          Password
        </label>
        <input
          className="w-full rounded-xl border border-stone-300 bg-amber-50/40 px-3 py-2.5 text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-amber-600 focus:ring-4 focus:ring-amber-300/40"
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={formValues.password}
          onChange={handleChange}
          placeholder="At least 8 chars with letters and numbers"
          required
        />

        <button
          className="mt-4 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-amber-700 to-amber-500 px-5 py-3 font-semibold text-amber-50 transition hover:-translate-y-px hover:shadow-lg hover:shadow-amber-900/20 disabled:cursor-not-allowed disabled:opacity-70"
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
            <dt className="font-semibold text-stone-800">Email</dt>
            <dd className="text-stone-600">{registeredUser.email}</dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
            <dt className="font-semibold text-stone-800">Role</dt>
            <dd className="text-stone-600">{registeredUser.role}</dd>
          </div>
        </dl>
      )}
    </>
  )
}