import { useEffect, useRef, useState } from 'react'
import Swal from 'sweetalert2'
import { requestRegistrationOtp, verifyRegistrationOtp } from '../api/api'
import { startGoogleOAuth } from '../utils/googleOAuth'
import { writeAuthSession } from '../utils/authSession'

const initialFormState = {
  fullName: '',
  email: '',
  password: '',
  otp: '',
}

const OTP_LENGTH = 6

const initialFieldErrors = {
  fullName: '',
  email: '',
  password: '',
  otp: '',
}

function validateRegistrationDetails(formValues) {
  const errors = { ...initialFieldErrors }

  const fullName = formValues.fullName.trim()
  if (!fullName) {
    errors.fullName = 'Full name is required.'
  } else if (fullName.length < 2) {
    errors.fullName = 'Full name must be at least 2 characters.'
  } else if (!/^[A-Za-z ]+$/.test(fullName)) {
    errors.fullName = 'Full name can contain only letters and spaces.'
  }

  const email = formValues.email.trim()
  if (!email) {
    errors.email = 'Email is required.'
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (email && !emailPattern.test(email)) {
    errors.email = 'Please enter a valid email address.'
  }

  const password = formValues.password
  if (!password) {
    errors.password = 'Password is required.'
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters.'
  } else if (password.length > 72) {
    errors.password = 'Password must be at most 72 characters.'
  } else if (!/[A-Z]/.test(password)) {
    errors.password = 'Password must include at least one uppercase letter.'
  } else if (!/[a-z]/.test(password)) {
    errors.password = 'Password must include at least one lowercase letter.'
  } else if (!/\d/.test(password)) {
    errors.password = 'Password must include at least one number.'
  } else if (!/[^A-Za-z0-9]/.test(password)) {
    errors.password = 'Password must include at least one special character.'
  }

  return errors
}

function validateOtp(otpValue) {
  if (!otpValue.trim()) {
    return 'OTP is required.'
  }

  if (!/^\d{6}$/.test(otpValue.trim())) {
    return 'OTP must be a 6-digit number.'
  }

  return ''
}

function hasValidationErrors(errors) {
  return Object.values(errors).some(Boolean)
}

function formatOtpExpiry(expiresAt) {
  if (!expiresAt) {
    return 'in 5 minutes.'
  }

  const parsedDate = new Date(expiresAt)
  if (Number.isNaN(parsedDate.getTime())) {
    return 'in 5 minutes.'
  }

  return `at ${parsedDate.toLocaleTimeString()}.`
}

function navigateTo(pathname) {
  window.history.pushState(null, '', pathname)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export default function SignUpPage() {
  const [formValues, setFormValues] = useState(initialFormState)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [isResendingOtp, setIsResendingOtp] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [otpStep, setOtpStep] = useState(false)
  const [otpExpiresAt, setOtpExpiresAt] = useState(null)
  const [fieldErrors, setFieldErrors] = useState(initialFieldErrors)
  const otpInputRefs = useRef([])

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search)
    const oauthError = queryParams.get('error')

    if (oauthError) {
      setErrorMessage('Google sign-up failed. Please try again.')
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  useEffect(() => {
    if (!otpStep) {
      return
    }

    otpInputRefs.current[0]?.focus()
  }, [otpStep])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }))

    setFieldErrors((prev) => ({
      ...prev,
      [name]: '',
    }))
  }

  const handleOtpDigitChange = (index, rawValue) => {
    const digit = rawValue.replace(/\D/g, '').slice(-1)
    const nextDigits = Array.from({ length: OTP_LENGTH }, (_, digitIndex) => formValues.otp[digitIndex] ?? '')
    nextDigits[index] = digit

    setFormValues((prev) => ({
      ...prev,
      otp: nextDigits.join(''),
    }))

    setFieldErrors((prev) => ({
      ...prev,
      otp: '',
    }))

    if (digit && index < OTP_LENGTH - 1) {
      otpInputRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index, event) => {
    const allowedControlKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End']

    if (event.key === 'Backspace') {
      event.preventDefault()
      const nextDigits = Array.from({ length: OTP_LENGTH }, (_, digitIndex) => formValues.otp[digitIndex] ?? '')

      if (nextDigits[index]) {
        nextDigits[index] = ''
      } else if (index > 0) {
        nextDigits[index - 1] = ''
        otpInputRefs.current[index - 1]?.focus()
      }

      setFormValues((prev) => ({
        ...prev,
        otp: nextDigits.join(''),
      }))

      setFieldErrors((prev) => ({
        ...prev,
        otp: '',
      }))
      return
    }

    if (event.key === 'Delete') {
      event.preventDefault()
      const nextDigits = Array.from({ length: OTP_LENGTH }, (_, digitIndex) => formValues.otp[digitIndex] ?? '')
      nextDigits[index] = ''

      setFormValues((prev) => ({
        ...prev,
        otp: nextDigits.join(''),
      }))

      setFieldErrors((prev) => ({
        ...prev,
        otp: '',
      }))
      return
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      if (index > 0) {
        otpInputRefs.current[index - 1]?.focus()
      }
      return
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      if (index < OTP_LENGTH - 1) {
        otpInputRefs.current[index + 1]?.focus()
      }
      return
    }

    if (!allowedControlKeys.includes(event.key) && event.key.length === 1 && !/\d/.test(event.key)) {
      event.preventDefault()
    }
  }

  const handleOtpPaste = (event) => {
    event.preventDefault()
    const pastedDigits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)

    if (!pastedDigits) {
      return
    }

    setFormValues((prev) => ({
      ...prev,
      otp: pastedDigits,
    }))

    setFieldErrors((prev) => ({
      ...prev,
      otp: '',
    }))

    const focusIndex = Math.min(pastedDigits.length, OTP_LENGTH - 1)
    otpInputRefs.current[focusIndex]?.focus()
  }

  const handleRequestOtp = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    const validationErrors = validateRegistrationDetails(formValues)
    setFieldErrors((prev) => ({
      ...prev,
      ...validationErrors,
      otp: '',
    }))

    if (hasValidationErrors(validationErrors)) {
      setErrorMessage('Please fix the highlighted fields.')
      return
    }

    const payload = {
      fullName: formValues.fullName.trim(),
      email: formValues.email.trim(),
      password: formValues.password,
    }

    setIsSubmitting(true)

    try {
      const responseBody = await requestRegistrationOtp(payload)
      setOtpStep(true)
      setOtpExpiresAt(responseBody?.otpExpiresAt ?? null)
      setFormValues((prev) => ({
        ...prev,
        otp: '',
      }))

      const successEmail = responseBody?.email ?? payload.email
      setSuccessMessage(`A 6-digit OTP was sent to ${successEmail}. Code expires in 5 minutes.`)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to complete registration right now. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyOtp = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    const otpError = validateOtp(formValues.otp)
    if (otpError) {
      setFieldErrors((prev) => ({
        ...prev,
        otp: otpError,
      }))
      setErrorMessage('Please fix the highlighted fields.')
      return
    }

    setIsVerifyingOtp(true)

    try {
      const responseBody = await verifyRegistrationOtp({
        email: formValues.email.trim(),
        otp: formValues.otp.trim(),
      })

      const nextSession = {
        email: responseBody?.email ?? formValues.email.trim(),
        fullName: responseBody?.fullName?.trim() || formValues.fullName.trim(),
        role: responseBody?.role ?? 'USER',
        tokenType: responseBody?.tokenType ?? 'Bearer',
        expiresAt: responseBody?.expiresAt ?? null,
        token: responseBody?.token ?? null,
        passwordSetupRequired: responseBody?.passwordSetupRequired ?? false,
      }

      writeAuthSession(nextSession)

      setFormValues(initialFormState)
      setOtpStep(false)
      setOtpExpiresAt(null)
      setSuccessMessage('')
      await Swal.fire({
        title: 'Your account is now active!',
        icon: 'success',
        draggable: true,
      })
      navigateTo('/')
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to verify OTP right now. Please try again.'
      )
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  const handleResendOtp = async () => {
    setErrorMessage('')
    setSuccessMessage('')

    const validationErrors = validateRegistrationDetails(formValues)
    setFieldErrors((prev) => ({
      ...prev,
      ...validationErrors,
      otp: '',
    }))

    if (hasValidationErrors(validationErrors)) {
      setErrorMessage('Please fix the highlighted fields.')
      return
    }

    setIsResendingOtp(true)

    try {
      const responseBody = await requestRegistrationOtp({
        fullName: formValues.fullName.trim(),
        email: formValues.email.trim(),
        password: formValues.password,
      })

      setOtpExpiresAt(responseBody?.otpExpiresAt ?? null)
      setFormValues((prev) => ({
        ...prev,
        otp: '',
      }))
      setSuccessMessage(`A new OTP was sent to ${formValues.email.trim()}.`)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to resend OTP right now. Please try again.'
      )
    } finally {
      setIsResendingOtp(false)
    }
  }

  const handleBackToDetails = () => {
    setOtpStep(false)
    setOtpExpiresAt(null)
    setErrorMessage('')
    setSuccessMessage('')
    setFieldErrors((prev) => ({
      ...prev,
      otp: '',
    }))
    setFormValues((prev) => ({
      ...prev,
      otp: '',
    }))
  }

  const otpDigits = Array.from({ length: OTP_LENGTH }, (_, index) => formValues.otp[index] ?? '')

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-0">
      <div className="w-full max-w-md space-y-4">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-slate-900">UniPilot</h1>
          <p className="mt-2 text-sm text-slate-500">
            {otpStep ? 'Enter the OTP sent to your email' : 'Create your account to continue'}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <form className="space-y-4" onSubmit={otpStep ? handleVerifyOtp : handleRequestOtp} noValidate>
            {!otpStep && (
              <>
                <input
                  name="fullName"
                  type="text"
                  placeholder="Full name"
                  value={formValues.fullName}
                  onChange={handleChange}
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none ${
                    fieldErrors.fullName ? 'border-red-400 focus:border-red-500' : 'border-slate-300 focus:border-slate-900'
                  }`}
                  required
                />
                {fieldErrors.fullName && (
                  <p className="text-xs text-red-600">{fieldErrors.fullName}</p>
                )}

                <input
                  name="email"
                  type="email"
                  placeholder="Email address"
                  value={formValues.email}
                  onChange={handleChange}
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none ${
                    fieldErrors.email ? 'border-red-400 focus:border-red-500' : 'border-slate-300 focus:border-slate-900'
                  }`}
                  required
                />
                {fieldErrors.email && (
                  <p className="text-xs text-red-600">{fieldErrors.email}</p>
                )}

                <input
                  name="password"
                  type="password"
                  placeholder="Password"
                  value={formValues.password}
                  onChange={handleChange}
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none ${
                    fieldErrors.password ? 'border-red-400 focus:border-red-500' : 'border-slate-300 focus:border-slate-900'
                  }`}
                  required
                />
                {fieldErrors.password && (
                  <p className="text-xs text-red-600">{fieldErrors.password}</p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {isSubmitting ? 'Sending OTP...' : 'Send verification OTP'}
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
                    <path fill="#EA4335" d="M24 9.5c3.2 0 6.1 1.1 8.4 3.2l6.3-6.3C34.5 2.6 29.6 0 24 0 14.6 0 6.6 5.5 2.7 13.5l7.4 5.8C12.1 13.1 17.6 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.5 24.5c0-1.7-.2-3.3-.5-4.9H24v9.3h12.6c-.5 2.9-2.2 5.4-4.7 7.1l7.3 5.7c4.3-4 7.3-9.9 7.3-17.2z"/>
                    <path fill="#FBBC05" d="M10.1 28.3c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.4-5.8C1 16.2 0 19.9 0 23.7s1 7.5 2.7 10.4l7.4-5.8z"/>
                    <path fill="#34A853" d="M24 47c6.5 0 11.9-2.1 15.9-5.7l-7.3-5.7c-2 1.3-4.6 2.1-8.6 2.1-6.4 0-11.9-3.6-13.9-8.8l-7.4 5.8C6.6 41.5 14.6 47 24 47z"/>
                  </svg>
                  Register with Google
                </button>
              </>
            )}

            {otpStep && (
              <>
                <input
                  name="email"
                  type="email"
                  value={formValues.email}
                  readOnly
                  className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2.5 text-sm text-slate-500 outline-none"
                />

                <div className="flex items-center justify-between gap-2" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(element) => {
                        otpInputRefs.current[index] = element
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="one-time-code"
                      aria-label={`OTP digit ${index + 1}`}
                      maxLength={1}
                      value={digit}
                      onChange={(event) => handleOtpDigitChange(index, event.target.value)}
                      onKeyDown={(event) => handleOtpKeyDown(index, event)}
                      className={`h-12 w-12 rounded-lg border text-center text-lg font-semibold tracking-normal outline-none sm:h-14 sm:w-14 ${
                        fieldErrors.otp ? 'border-red-400 focus:border-red-500' : 'border-slate-300 focus:border-slate-900'
                      }`}
                      required
                    />
                  ))}
                </div>
                {fieldErrors.otp && (
                  <p className="text-xs text-red-600">{fieldErrors.otp}</p>
                )}

                <button
                  type="submit"
                  disabled={isVerifyingOtp}
                  className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {isVerifyingOtp ? 'Verifying OTP...' : 'Verify and create account'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isResendingOtp}
                    className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {isResendingOtp ? 'Resending...' : 'Resend OTP'}
                  </button>
                  <button
                    type="button"
                    onClick={handleBackToDetails}
                    className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Change details
                  </button>
                </div>

                <p className="text-xs text-slate-500">Code expires {formatOtpExpiry(otpExpiresAt)}</p>
              </>
            )}
          </form>

          {/* Messages */}
          {errorMessage && (
            <p className="mt-4 text-sm text-red-600">{errorMessage}</p>
          )}

          {successMessage && (
            <p className="mt-4 text-sm text-green-600">{successMessage}</p>
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