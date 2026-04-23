import { useCallback, useEffect, useMemo, useState } from 'react'
import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'
import {
  approveBooking,
  cancelBooking,
  getAllBookings,
  getMyBookings,
  rejectBooking,
  updateBooking,
} from '../../api/api'

const statusBadgeClasses = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-rose-100 text-rose-700',
  CANCELLED: 'bg-slate-200 text-slate-700',
}

function formatStatus(value) {
  return value
    ?.toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatDateTime(date, startTime, endTime) {
  return `${date} ${startTime} - ${endTime}`
}

export default function BookingList({ scope = 'my', onRaiseTicket }) {
  const [bookings, setBookings] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editFormData, setEditFormData] = useState({
    date: '',
    startTime: '',
    endTime: '',
    attendees: '',
    purpose: '',
  })
  const [fieldErrors, setFieldErrors] = useState({
    date: '',
    startTime: '',
    endTime: '',
    attendees: '',
    purpose: '',
  })

  const isAllScope = scope === 'all'

  const loadBookings = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const response = isAllScope
        ? await getAllBookings(statusFilter || undefined)
        : await getMyBookings()
      setBookings(Array.isArray(response) ? response : [])
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load bookings right now.')
    } finally {
      setIsLoading(false)
    }
  }, [isAllScope, statusFilter])

  useEffect(() => {
    loadBookings()
  }, [loadBookings])

  const sortedBookings = useMemo(
    () => [...bookings].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [bookings],
  )

  const handleApprove = async (bookingId) => {
    const confirmation = await Swal.fire({
      title: 'Approve booking?',
      text: 'This booking request will be marked as approved.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, approve',
      cancelButtonText: 'No',
      confirmButtonColor: '#059669',
    })

    if (!confirmation.isConfirmed) {
      return
    }

    setIsActionLoading(true)
    setErrorMessage('')
    try {
      await approveBooking(bookingId)
      await loadBookings()
      await Swal.fire({
        title: 'Approved',
        text: 'Booking was approved successfully.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
      })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to approve booking.')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleReject = async (bookingId) => {
    const rejectionInput = await Swal.fire({
      title: 'Reject booking',
      text: 'Please provide a reason for rejection.',
      icon: 'warning',
      input: 'textarea',
      inputLabel: 'Rejection reason',
      inputPlaceholder: 'Type your reason here...',
      inputAttributes: {
        maxlength: '500',
      },
      showCancelButton: true,
      confirmButtonText: 'Reject booking',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return 'Rejection reason is required.'
        }

        if (value.trim().length > 500) {
          return 'Rejection reason must be at most 500 characters.'
        }

        return null
      },
    })

    if (!rejectionInput.isConfirmed) {
      return
    }

    const reason = rejectionInput.value.trim()

    setIsActionLoading(true)
    setErrorMessage('')
    try {
      await rejectBooking(bookingId, reason)
      await loadBookings()
      await Swal.fire({
        title: 'Rejected',
        text: 'Booking was rejected successfully.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
      })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to reject booking.')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleCancel = async (bookingId) => {
    setIsActionLoading(true)
    setErrorMessage('')
    try {
      await cancelBooking(bookingId)
      await loadBookings()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to cancel booking.')
    } finally {
      setIsActionLoading(false)
    }
  }

  const openBookingModal = (booking) => {
    setSelectedBooking(booking)
    setIsEditing(false)
  }

  const closeBookingModal = () => {
    setSelectedBooking(null)
    setIsEditing(false)
    setEditFormData({
      date: '',
      startTime: '',
      endTime: '',
      attendees: '',
      purpose: '',
    })
    setFieldErrors({
      date: '',
      startTime: '',
      endTime: '',
      attendees: '',
      purpose: '',
    })
  }

  const handleStartEdit = () => {
    if (!selectedBooking) return
    setEditFormData({
      date: selectedBooking.date || '',
      startTime: selectedBooking.startTime || '',
      endTime: selectedBooking.endTime || '',
      attendees: selectedBooking.attendees || '',
      purpose: selectedBooking.purpose || '',
    })
    setFieldErrors({
      date: '',
      startTime: '',
      endTime: '',
      attendees: '',
      purpose: '',
    })
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditFormData({
      date: '',
      startTime: '',
      endTime: '',
      attendees: '',
      purpose: '',
    })
  }

  const handleEditInputChange = (field, value) => {
    setEditFormData((prev) => ({ ...prev, [field]: value }))
    // Clear field error when user starts typing
    setFieldErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const validateEditForm = () => {
    const errors = {}
    const todayIso = new Date().toISOString().split('T')[0]

    if (!editFormData.date) {
      errors.date = 'Date is required.'
    } else if (editFormData.date < todayIso) {
      errors.date = 'Date cannot be in the past.'
    }

    if (!editFormData.startTime) {
      errors.startTime = 'Start time is required.'
    }

    if (!editFormData.endTime) {
      errors.endTime = 'End time is required.'
    }

    if (editFormData.startTime && editFormData.endTime && editFormData.endTime <= editFormData.startTime) {
      errors.endTime = 'End time must be after start time.'
    }

    if (!editFormData.purpose.trim()) {
      errors.purpose = 'Purpose is required.'
    } else if (editFormData.purpose.trim().length > 40) {
      errors.purpose = 'Purpose must be at most 40 characters.'
    }

    const attendees = Number(editFormData.attendees)
    if (!editFormData.attendees) {
      errors.attendees = 'Expected attendees is required.'
    } else if (!Number.isFinite(attendees) || attendees < 1) {
      errors.attendees = 'Attendees must be greater than 0.'
    }

    return errors
  }

  const handleEditSubmit = async () => {
    if (!selectedBooking) return

    // Validate form first
    const validationErrors = validateEditForm()
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors)
      return
    }

    setIsActionLoading(true)
    setErrorMessage('')
    setFieldErrors({
      date: '',
      startTime: '',
      endTime: '',
      attendees: '',
      purpose: '',
    })
    try {
      // Format time to HH:mm:ss for LocalTime parsing in backend
      const formatTime = (time) => time?.length === 5 ? `${time}:00` : time

      await updateBooking(selectedBooking.id, {
        date: editFormData.date,
        startTime: formatTime(editFormData.startTime),
        endTime: formatTime(editFormData.endTime),
        attendees: Number(editFormData.attendees),
        purpose: editFormData.purpose,
      })
      closeBookingModal()
      await loadBookings()
      await Swal.fire({
        title: 'Updated',
        text: 'Booking was updated successfully.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
      })
    } catch (error) {
      // Check if error has field information
      if (error instanceof Error && error.field) {
        setFieldErrors(prev => ({
          ...prev,
          [error.field]: error.message
        }))
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to update booking.')
      }
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleDeleteFromModal = async () => {
    if (!selectedBooking) {
      return
    }

    const confirmation = await Swal.fire({
      title: 'Delete booking?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
    })

    if (!confirmation.isConfirmed) {
      return
    }

    setIsActionLoading(true)
    setErrorMessage('')
    try {
      await cancelBooking(selectedBooking.id)
      closeBookingModal()
      await loadBookings()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to delete booking.')
    } finally {
      setIsActionLoading(false)
    }
  }

  const navigateToTicket = (bookingId) => {
    if (typeof onRaiseTicket === 'function') {
      onRaiseTicket(bookingId)
      return
    }

    const pathname = `/tickets/create?bookingId=${encodeURIComponent(bookingId)}`
    window.history.pushState(null, '', pathname)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  return (
    <section className="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5 md:p-8">
      {isAllScope && (
        <div className="mb-5 flex items-center gap-3">
          <label htmlFor="statusFilter" className="text-sm font-medium text-slate-700">Filter by status</label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
          >
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">Loading bookings...</div>
      ) : sortedBookings.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">No bookings found.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Resource ID</th>
                <th className="px-4 py-3 font-semibold">Resource</th>
                <th className="px-4 py-3 font-semibold">Resource Type</th>
                <th className="px-4 py-3 font-semibold">Date &amp; Time</th>
                {isAllScope && <th className="px-4 py-3 font-semibold">Purpose</th>}
                <th className="px-4 py-3 font-semibold">Attendees</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {sortedBookings.map((booking) => {
                const badgeClass = statusBadgeClasses[booking.status] ?? 'bg-slate-100 text-slate-700'
                const canModerate = isAllScope && booking.status === 'PENDING'
                const canCancel = booking.status !== 'CANCELLED'

                return (
                  <tr key={booking.id}>
                    <td className="px-4 py-3 font-medium text-slate-800">{booking.resourceId}</td>
                    <td className="px-4 py-3 text-slate-700">{booking.resourceName}</td>
                    <td className="px-4 py-3 text-slate-700">{booking.resourceType}</td>
                    <td className="px-4 py-3 text-slate-700">{formatDateTime(booking.date, booking.startTime, booking.endTime)}</td>
                    {isAllScope && (
                      <td className="px-4 py-3 text-slate-700">
                        <p className="max-w-xs">{booking.purpose}</p>
                        {booking.rejectionReason && (
                          <p className="mt-1 text-xs text-rose-700">Reason: {booking.rejectionReason}</p>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 text-slate-700">{booking.attendees}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}>
                        {formatStatus(booking.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {!isAllScope && (
                          <button
                            type="button"
                            onClick={() => openBookingModal(booking)}
                            className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 transition hover:border-teal-300 hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <span aria-hidden="true">View</span>
                          </button>
                        )}

                        {isAllScope && canModerate && (
                          <>
                            <button
                              type="button"
                              disabled={isActionLoading}
                              onClick={() => handleApprove(booking.id)}
                              className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={isActionLoading}
                              onClick={() => handleReject(booking.id)}
                              className="rounded-full bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {isAllScope && canCancel && (
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() => handleCancel(booking.id)}
                            className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedBooking && !isAllScope && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl rounded-4xl border border-teal-100 bg-white p-8 shadow-xl shadow-teal-900/5 md:p-10">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Booking Request</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                  {isEditing ? 'Edit Booking' : `Booking #${selectedBooking.id}`}
                </h3>
              </div>
              <span
                className={`inline-flex self-start rounded-full px-3 py-1 text-xs font-semibold ${
                  statusBadgeClasses[selectedBooking.status] ?? 'bg-slate-100 text-slate-700'
                }`}
              >
                {formatStatus(selectedBooking.status)}
              </span>
            </div>

            {isEditing ? (
              <div className="grid gap-6 border-b border-slate-100 py-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Resource ID
                  </label>
                  <input
                    type="text"
                    value={selectedBooking.resourceId}
                    disabled
                    className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm font-medium text-slate-500 outline-none cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Date
                  </label>
                  <input
                    type="date"
                    value={editFormData.date}
                    onChange={(e) => handleEditInputChange('date', e.target.value)}
                    className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:ring-2 ${
                      fieldErrors.date
                        ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                        : 'border-slate-300 focus:border-teal-500 focus:ring-teal-200'
                    }`}
                  />
                  {fieldErrors.date && (
                    <p className="mt-1.5 text-xs text-rose-600">{fieldErrors.date}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Attendees
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editFormData.attendees}
                    onChange={(e) => handleEditInputChange('attendees', e.target.value)}
                    className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:ring-2 ${
                      fieldErrors.attendees
                        ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                        : 'border-slate-300 focus:border-teal-500 focus:ring-teal-200'
                    }`}
                  />
                  {fieldErrors.attendees && (
                    <p className="mt-1.5 text-xs text-rose-600">{fieldErrors.attendees}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={editFormData.startTime}
                    onChange={(e) => handleEditInputChange('startTime', e.target.value)}
                    className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:ring-2 ${
                      fieldErrors.startTime
                        ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                        : 'border-slate-300 focus:border-teal-500 focus:ring-teal-200'
                    }`}
                  />
                  {fieldErrors.startTime && (
                    <p className="mt-1.5 text-xs text-rose-600">{fieldErrors.startTime}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={editFormData.endTime}
                    onChange={(e) => handleEditInputChange('endTime', e.target.value)}
                    className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:ring-2 ${
                      fieldErrors.endTime
                        ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                        : 'border-slate-300 focus:border-teal-500 focus:ring-teal-200'
                    }`}
                  />
                  {fieldErrors.endTime && (
                    <p className="mt-1.5 text-xs text-rose-600">{fieldErrors.endTime}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Purpose
                  </label>
                  <textarea
                    value={editFormData.purpose}
                    onChange={(e) => handleEditInputChange('purpose', e.target.value)}
                    rows={3}
                    maxLength={40}
                    className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:ring-2 ${
                      fieldErrors.purpose
                        ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                        : 'border-slate-300 focus:border-teal-500 focus:ring-teal-200'
                    }`}
                  />
                  {fieldErrors.purpose && (
                    <p className="mt-1.5 text-xs text-rose-600">{fieldErrors.purpose}</p>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="grid gap-6 border-b border-slate-100 py-6 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Resource ID</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">{selectedBooking.resourceId}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Date</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">{selectedBooking.date}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Attendees</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">{selectedBooking.attendees}</p>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Time Slot</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">
                      {selectedBooking.startTime} - {selectedBooking.endTime}
                    </p>
                  </div>
                </div>

                <div className="border-b border-slate-100 py-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Purpose</p>
                  <p className="mt-3 leading-relaxed text-slate-700">{selectedBooking.purpose}</p>
                </div>

                {selectedBooking.rejectionReason && (
                  <div className="border-b border-slate-100 py-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Rejection Reason</p>
                    <p className="mt-3 text-sm font-medium text-red-500">{selectedBooking.rejectionReason}</p>
                  </div>
                )}
              </>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    disabled={isActionLoading}
                    onClick={handleEditSubmit}
                    className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isActionLoading ? 'Saving...' : 'Save Changes'}
                  </button>

                  <button
                    type="button"
                    disabled={isActionLoading}
                    onClick={handleCancelEdit}
                    className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  {selectedBooking.status === 'PENDING' && (
                    <button
                      type="button"
                      onClick={handleStartEdit}
                      className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                      Update
                    </button>
                  )}

                  {selectedBooking.status === 'PENDING' && (
                    <button
                      type="button"
                      disabled={isActionLoading}
                      onClick={handleDeleteFromModal}
                      className="rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isActionLoading ? 'Deleting...' : 'Delete'}
                    </button>
                  )}

                  {(selectedBooking.status === 'APPROVED' || selectedBooking.status === 'REJECTED') && (
                    <button
                      type="button"
                      onClick={() => navigateToTicket(selectedBooking.id)}
                      className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700"
                    >
                      Raise Ticket
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={closeBookingModal}
                    className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
