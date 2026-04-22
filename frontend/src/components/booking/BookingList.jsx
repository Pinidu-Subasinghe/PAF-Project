import { useEffect, useMemo, useState } from 'react'
import {
  approveBooking,
  cancelBooking,
  getAllBookings,
  getMyBookings,
  rejectBooking,
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

export default function BookingList({ scope = 'my' }) {
  const [bookings, setBookings] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const isAllScope = scope === 'all'

  const loadBookings = async () => {
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
  }

  useEffect(() => {
    loadBookings()
  }, [isAllScope, statusFilter])

  const sortedBookings = useMemo(
    () => [...bookings].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [bookings],
  )

  const handleApprove = async (bookingId) => {
    setIsActionLoading(true)
    setErrorMessage('')
    try {
      await approveBooking(bookingId)
      await loadBookings()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to approve booking.')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleReject = async (bookingId) => {
    const reason = window.prompt('Enter rejection reason:')
    if (!reason || !reason.trim()) {
      return
    }

    setIsActionLoading(true)
    setErrorMessage('')
    try {
      await rejectBooking(bookingId, reason.trim())
      await loadBookings()
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

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5 md:p-8">
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
                <th className="px-4 py-3 font-semibold">Date &amp; Time</th>
                <th className="px-4 py-3 font-semibold">Purpose</th>
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
                    <td className="px-4 py-3 text-slate-700">{formatDateTime(booking.date, booking.startTime, booking.endTime)}</td>
                    <td className="px-4 py-3 text-slate-700">
                      <p className="max-w-xs">{booking.purpose}</p>
                      {booking.rejectionReason && (
                        <p className="mt-1 text-xs text-rose-700">Reason: {booking.rejectionReason}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{booking.attendees}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}>
                        {formatStatus(booking.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {canModerate && (
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

                        {canCancel && (
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() => handleCancel(booking.id)}
                            className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isAllScope ? 'Clear' : 'Cancel'}
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
    </section>
  )
}
