import { useState } from 'react'
import { createBooking } from '../../api/api'

function navigateTo(pathname) {
  window.history.pushState(null, '', pathname)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export default function BookingForm({ resourceId }) {
  const [form, setForm] = useState({
    date: '',
    startTime: '',
    endTime: '',
    purpose: '',
    attendees: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const todayIso = new Date().toISOString().split('T')[0]

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => {
      const next = { ...current, [name]: '' }
      if (name === 'startTime' || name === 'endTime') {
        next.time = ''
      }
      return next
    })
  }

  const validate = () => {
    const errors = {}

    if (!form.date) {
      errors.date = 'Date is required.'
    } else if (form.date < todayIso) {
      errors.date = 'Date cannot be in the past.'
    }

    if (!form.startTime) {
      errors.startTime = 'Start time is required.'
    }

    if (!form.endTime) {
      errors.endTime = 'End time is required.'
    }

    if (form.startTime && form.endTime && form.endTime <= form.startTime) {
      errors.endTime = 'End time must be after start time.'
    }

    if (!form.purpose.trim()) {
      errors.purpose = 'Purpose is required.'
    } else if (form.purpose.trim().length > 40) {
      errors.purpose = 'Purpose must be at most 40 characters.'
    }

    const attendees = Number(form.attendees)
    if (!form.attendees) {
      errors.attendees = 'Expected attendees is required.'
    } else if (!Number.isFinite(attendees) || attendees < 1) {
      errors.attendees = 'Attendees must be greater than 0.'
    }

    return errors
  }

  const formValidationErrors = validate()
  const isFormValid = Object.keys(formValidationErrors).length === 0

  const mapServerErrorToField = (message) => {
    const normalized = message.toLowerCase()
    if (normalized.includes('already booked')) return { field: 'time', message }
    if (normalized.includes('purpose')) return { field: 'purpose', message }
    if (normalized.includes('attendees')) return { field: 'attendees', message }
    if (normalized.includes('start time')) return { field: 'startTime', message }
    if (normalized.includes('end time')) return { field: 'endTime', message }
    if (normalized.includes('date')) return { field: 'date', message }
    if (normalized.includes('resource')) return { field: 'resourceId', message }
    return null
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')
    setFieldErrors({})

    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors)
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        resourceId,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        purpose: form.purpose.trim(),
        attendees: Number(form.attendees),
      }

      await createBooking(payload)
      setSuccessMessage('Booking request created successfully. Status is now PENDING.')
      setForm({
        date: '',
        startTime: '',
        endTime: '',
        purpose: '',
        attendees: '',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create booking right now.'
      const field =
        error &&
        typeof error === 'object' &&
        'field' in error &&
        typeof error.field === 'string' &&
        error.field.trim()
          ? error.field
          : null

      if (field) {
        if (field === 'time') {
          setFieldErrors((current) => ({
            ...current,
            time: message,
          }))
        } else {
          setFieldErrors((current) => ({ ...current, [field]: message }))
        }
      } else {
        const mapped = mapServerErrorToField(message)
        if (mapped) {
          if (mapped.field === 'time') {
            setFieldErrors((current) => ({
              ...current,
              time: mapped.message,
            }))
          } else {
            setFieldErrors((current) => ({ ...current, [mapped.field]: mapped.message }))
          }
        } else {
          setErrorMessage(message)
        }
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="mx-auto w-full max-w-3xl rounded-[2rem] border border-teal-100 bg-white p-8 shadow-xl shadow-teal-900/5">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">Booking Management</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Create Booking Request</h1>
      <p className="mt-2 text-sm text-slate-600">Submit your request. It will be created with status PENDING.</p>

      <form className="mt-8 grid gap-5" onSubmit={handleSubmit} noValidate>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Resource ID
          <input
            type="text"
            value={resourceId}
            readOnly
            className={`rounded-xl border px-4 py-2.5 text-slate-700 ${fieldErrors.resourceId ? 'border-rose-400 bg-rose-50' : 'border-slate-300 bg-slate-100'}`}
          />
          {fieldErrors.resourceId && <span className="text-red-500 text-sm mt-1">{fieldErrors.resourceId}</span>}
        </label>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Date
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              className={`rounded-xl border bg-white px-4 py-2.5 text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200 ${fieldErrors.date ? 'border-red-500 bg-red-50/50' : 'border-slate-300'}`}
            />
            {fieldErrors.date && <span className="text-red-500 text-sm mt-1">{fieldErrors.date}</span>}
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Expected Attendees
            <input
              type="number"
              name="attendees"
              value={form.attendees}
              onChange={handleChange}
              min="1"
              className={`rounded-xl border bg-white px-4 py-2.5 text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200 ${fieldErrors.attendees ? 'border-red-500 bg-red-50/50' : 'border-slate-300'}`}
            />
            {fieldErrors.attendees && <span className="text-red-500 text-sm mt-1">{fieldErrors.attendees}</span>}
          </label>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Start Time
            <input
              type="time"
              name="startTime"
              value={form.startTime}
              onChange={handleChange}
              className={`rounded-xl border bg-white px-4 py-2.5 text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200 ${fieldErrors.startTime || fieldErrors.time ? 'border-red-500 bg-red-50/50' : 'border-slate-300'}`}
            />
            {fieldErrors.startTime && <span className="text-red-500 text-sm mt-1">{fieldErrors.startTime}</span>}
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            End Time
            <input
              type="time"
              name="endTime"
              value={form.endTime}
              onChange={handleChange}
              className={`rounded-xl border bg-white px-4 py-2.5 text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200 ${fieldErrors.endTime || fieldErrors.time ? 'border-red-500 bg-red-50/50' : 'border-slate-300'}`}
            />
            {fieldErrors.endTime && <span className="text-red-500 text-sm mt-1">{fieldErrors.endTime}</span>}
          </label>
        </div>

        {fieldErrors.time && <p className="text-red-500 text-sm mt-1">{fieldErrors.time}</p>}

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Purpose
          <textarea
            name="purpose"
            value={form.purpose}
            onChange={handleChange}
            rows={4}
            maxLength={40}
            className={`rounded-xl border bg-white px-4 py-2.5 text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200 ${fieldErrors.purpose ? 'border-red-500 bg-red-50/50' : 'border-slate-300'}`}
          />
          {fieldErrors.purpose && <span className="text-red-500 text-sm mt-1">{fieldErrors.purpose}</span>}
        </label>

        {errorMessage && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div>
        )}

        {successMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-full bg-teal-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Booking'}
          </button>

          <button
            type="button"
            onClick={() => navigateTo('/bookings/my')}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
          >
            View My Bookings
          </button>
        </div>
      </form>
    </section>
  )
}
