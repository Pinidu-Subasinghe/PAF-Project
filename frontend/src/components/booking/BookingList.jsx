import { useCallback, useEffect, useMemo, useState } from 'react'
import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts'
import {
  approveBooking,
  cancelBooking,
  getAllBookings,
  getAllResources,
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

// Enum display name mapping
const resourceTypeDisplayNames = {
  LAB: 'Lab',
  LECTURE_HALL: 'Lecture Hall',
  MEETING_ROOM: 'Meeting Room',
  EQUIPMENT: 'Equipment',
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
  const [resourceTypeFilter, setResourceTypeFilter] = useState('')
  const [resourceIdSearch, setResourceIdSearch] = useState('')
  const [viewMode, setViewMode] = useState('bookings')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
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
  const [resources, setResources] = useState([])
  const [selectedResourceType, setSelectedResourceType] = useState('')
  const [selectedResourceId, setSelectedResourceId] = useState('')

  const isAllScope = scope === 'all'

  // Filter resources based on selected type
  const filteredResources = useMemo(() => {
    if (!selectedResourceType) return []
    console.log('Filtering resources by type:', selectedResourceType)
    console.log('Available resources:', resources)
    const filtered = resources.filter(resource => resource.type === selectedResourceType)
    console.log('Filtered resources:', filtered)
    return filtered
  }, [resources, selectedResourceType])

  // Get unique resource types for dropdown with display names
  const resourceTypes = useMemo(() => {
    const types = [...new Set(resources.map(resource => resource.type))]
    console.log('Available resource types:', types)
    return types
  }, [resources])

  // Fetch all resources for dropdown selection
  useEffect(() => {
    const loadResources = async () => {
      try {
        const response = await getAllResources()
        console.log('Resources API response:', response)
        setResources(Array.isArray(response) ? response : [])
      } catch (error) {
        console.error('Failed to load resources:', error)
      }
    }
    loadResources()
  }, [])

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
    () => {
      let filtered = [...bookings]

      // Filter by resource type
      if (resourceTypeFilter) {
        filtered = filtered.filter(booking => booking.resourceType === resourceTypeFilter)
      }

      // Filter by resource ID search
      if (resourceIdSearch) {
        const searchLower = resourceIdSearch.toLowerCase()
        filtered = filtered.filter(booking =>
          booking.resourceId.toString().includes(searchLower) ||
          booking.resourceName?.toLowerCase().includes(searchLower)
        )
      }

      return filtered.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    },
    [bookings, resourceTypeFilter, resourceIdSearch],
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
      closeBookingModal()
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
      closeBookingModal()
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
      closeBookingModal()
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
    console.log('Starting edit for booking:', selectedBooking)
    console.log('Booking resourceType:', selectedBooking.resourceType)
    console.log('Booking resourceId:', selectedBooking.resourceId)
    setEditFormData({
      date: selectedBooking.date || '',
      startTime: selectedBooking.startTime || '',
      endTime: selectedBooking.endTime || '',
      attendees: selectedBooking.attendees || '',
      purpose: selectedBooking.purpose || '',
    })
    setSelectedResourceType(selectedBooking.resourceType || '')
    setSelectedResourceId(selectedBooking.resourceId || '')
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

      // Ensure resourceId is valid - use selected or fallback to original
      const resourceIdToUse = selectedResourceId || selectedBooking.resourceId
      console.log('Using resourceId:', resourceIdToUse, 'selected:', selectedResourceId, 'original:', selectedBooking.resourceId)

      await updateBooking(selectedBooking.id, {
        resourceId: resourceIdToUse,
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

  // Analytics data calculations
  const analyticsData = useMemo(() => {
    const total = sortedBookings.length
    const approved = sortedBookings.filter(b => b.status === 'APPROVED').length
    const pending = sortedBookings.filter(b => b.status === 'PENDING').length
    const rejected = sortedBookings.filter(b => b.status === 'REJECTED').length
    const cancelled = sortedBookings.filter(b => b.status === 'CANCELLED').length

    // Bookings by status for pie chart
    const statusData = [
      { name: 'Pending', value: pending, color: '#f59e0b' },
      { name: 'Approved', value: approved, color: '#10b981' },
      { name: 'Rejected', value: rejected, color: '#ef4444' },
      { name: 'Cancelled', value: cancelled, color: '#64748b' },
    ].filter(item => item.value > 0)

    // Bookings by resource type for bar chart
    const resourceTypeData = Object.entries(
      sortedBookings.reduce((acc, booking) => {
        const type = resourceTypeDisplayNames[booking.resourceType] || booking.resourceType
        acc[type] = (acc[type] || 0) + 1
        return acc
      }, {})
    ).map(([name, value]) => ({ name, value }))

    // Bookings over time (last 30 days) for line chart
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (29 - i))
      return date.toISOString().split('T')[0]
    })

    const timeData = last30Days.map(date => ({
      date: date.slice(5),
      bookings: sortedBookings.filter(b => b.date === date).length,
    }))

    // Top 5 most booked resources
    const resourceBookings = sortedBookings.reduce((acc, booking) => {
      const key = `${booking.resourceName} (${booking.resourceType})`
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})

    const topResources = Object.entries(resourceBookings)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))

    return {
      total,
      approved,
      pending,
      rejected,
      cancelled,
      statusData,
      resourceTypeData,
      timeData,
      topResources,
    }
  }, [sortedBookings])

  // Export to CSV function
  const exportToCSV = () => {
    const headers = ['ID', 'Resource ID', 'Resource Name', 'Resource Type', 'Date', 'Start Time', 'End Time', 'Status', 'Attendees', 'Purpose']
    const csvContent = [
      headers.join(','),
      ...sortedBookings.map(booking => [
        booking.id,
        booking.resourceId,
        `"${booking.resourceName}"`,
        booking.resourceType,
        booking.date,
        booking.startTime,
        booking.endTime,
        booking.status,
        booking.attendees,
        `"${booking.purpose || ''}"`,
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bookings-report-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    Swal.fire({
      title: 'Export Complete',
      text: 'Bookings report has been downloaded.',
      icon: 'success',
      timer: 1500,
      showConfirmButton: false,
    })
  }

  return (
    <section className="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5 md:p-8">
      {/* Toggle Switch for Admin */}
      {isAllScope && (
        <div className="mb-6 flex items-center justify-start">
          <div className="flex bg-slate-100 rounded-full p-1">
            <button
              onClick={() => setViewMode('bookings')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                viewMode === 'bookings'
                  ? 'bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Bookings
            </button>
            <button
              onClick={() => setViewMode('analytics')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                viewMode === 'analytics'
                  ? 'bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Analytics
            </button>
          </div>
        </div>
      )}

      {/* BOOKINGS VIEW */}
      {viewMode === 'bookings' && (
        <>
          {isAllScope && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-3">
                  <label htmlFor="statusFilter" className="text-sm font-medium text-slate-700">Status</label>
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
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <label htmlFor="resourceTypeFilter" className="text-sm font-medium text-slate-700">Resource Type</label>
                  <select
                    id="resourceTypeFilter"
                    value={resourceTypeFilter}
                    onChange={(event) => setResourceTypeFilter(event.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                  >
                    <option value="">All</option>
                    <option value="LAB">Lab</option>
                    <option value="LECTURE_HALL">Lecture Hall</option>
                    <option value="MEETING_ROOM">Meeting Room</option>
                    <option value="EQUIPMENT">Equipment</option>
                  </select>
                </div>
              </div>

              <input
                id="resourceIdSearch"
                type="text"
                value={resourceIdSearch}
                onChange={(event) => setResourceIdSearch(event.target.value)}
                placeholder="Search by ID or name..."
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200 placeholder:text-slate-400"
              />
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
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {sortedBookings.map((booking) => {
                const badgeClass = statusBadgeClasses[booking.status] ?? 'bg-slate-100 text-slate-700'

                return (
                  <tr key={booking.id}>
                    <td className="px-4 py-3 font-medium text-slate-800">{booking.resourceId}</td>
                    <td className="px-4 py-3 text-slate-700">{booking.resourceName}</td>
                    <td className="px-4 py-3 text-slate-700">{booking.resourceType}</td>
                    <td className="px-4 py-3 text-slate-700">{formatDateTime(booking.date, booking.startTime, booking.endTime)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}>
                        {formatStatus(booking.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openBookingModal(booking)}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span aria-hidden="true">View</span>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedBooking && (
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
                    Resource Type
                  </label>
                  <select
                    value={selectedResourceType}
                    onChange={(e) => {
                      setSelectedResourceType(e.target.value)
                      setSelectedResourceId('') // Reset resource ID when type changes
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                  >
                    <option value="">Select type...</option>
                    {resourceTypes.map(type => (
                      <option key={type} value={type}>
                        {resourceTypeDisplayNames[type] || type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Resource Name
                  </label>
                  <select
                    value={selectedResourceId}
                    onChange={(e) => setSelectedResourceId(e.target.value)}
                    disabled={!selectedResourceType}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200 disabled:border-slate-200 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Select resource...</option>
                    {filteredResources.map(resource => (
                      <option key={resource.id} value={resource.id}>{resource.name}</option>
                    ))}
                  </select>
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
                    <p className="text-xs uppercase tracking-wide text-slate-400">Resource Name</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">{selectedBooking.resourceName}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Resource Type</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">
                      {resourceTypeDisplayNames[selectedBooking.resourceType] || selectedBooking.resourceType}
                    </p>
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
                  {isAllScope ? (
                    // Admin buttons
                    <>
                      {selectedBooking.status === 'PENDING' && (
                        <>
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() => handleApprove(selectedBooking.id)}
                            className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() => handleReject(selectedBooking.id)}
                            className="rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      <div className="relative group">
                        <button
                          type="button"
                          disabled={isActionLoading || selectedBooking.status === 'PENDING'}
                          onClick={() => selectedBooking.status !== 'PENDING' && handleCancel(selectedBooking.id)}
                          className={`rounded-full border px-5 py-2.5 text-sm font-semibold transition ${
                            selectedBooking.status === 'PENDING'
                              ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                              : 'border-slate-300 text-slate-700 hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60'
                          }`}
                        >
                          Clear
                        </button>
                        {selectedBooking.status === 'PENDING' && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-slate-800 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            Cannot clear pending bookings
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    // User buttons
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
                    </>
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
        </>
      )}

      {/* ANALYTICS VIEW */}
      {viewMode === 'analytics' && (
        <div className="space-y-6">
          {/* Analytics Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3">
                <label htmlFor="analyticsStatusFilter" className="text-sm font-medium text-slate-700">Status</label>
                <select
                  id="analyticsStatusFilter"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                >
                  <option value="">All</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <label htmlFor="analyticsResourceTypeFilter" className="text-sm font-medium text-slate-700">Resource Type</label>
                <select
                  id="analyticsResourceTypeFilter"
                  value={resourceTypeFilter}
                  onChange={(event) => setResourceTypeFilter(event.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                >
                  <option value="">All</option>
                  <option value="LAB">Lab</option>
                  <option value="LECTURE_HALL">Lecture Hall</option>
                  <option value="MEETING_ROOM">Meeting Room</option>
                  <option value="EQUIPMENT">Equipment</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-slate-700">Date Range</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                />
                <span className="text-slate-500">to</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                />
              </div>
            </div>

            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Report
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-blue-700">Total Bookings</p>
              </div>
              <p className="text-3xl font-bold text-blue-900">{analyticsData.total}</p>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-6 border border-emerald-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-600 rounded-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-emerald-700">Approved</p>
              </div>
              <p className="text-3xl font-bold text-emerald-900">{analyticsData.approved}</p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-6 border border-amber-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-amber-600 rounded-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-amber-700">Pending</p>
              </div>
              <p className="text-3xl font-bold text-amber-900">{analyticsData.pending}</p>
            </div>

            <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-xl p-6 border border-rose-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-rose-600 rounded-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-rose-700">Rejected</p>
              </div>
              <p className="text-3xl font-bold text-rose-900">{analyticsData.rejected}</p>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart - Bookings by Status */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Bookings by Status</h3>
              <div className="h-64">
                {analyticsData.statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData.statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {analyticsData.statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    No data available
                  </div>
                )}
              </div>
            </div>

            {/* Bar Chart - Bookings by Resource Type */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Bookings by Resource Type</h3>
              <div className="h-64">
                {analyticsData.resourceTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.resourceTypeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#0d9488" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    No data available
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Line Chart - Bookings Over Time */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Bookings Over Time (Last 30 Days)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analyticsData.timeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="bookings" stroke="#0d9488" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top 5 Resources Table */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Top 5 Most Booked Resources</h3>
              {analyticsData.topResources.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-4 py-3 font-semibold rounded-tl-lg">Resource</th>
                        <th className="px-4 py-3 font-semibold rounded-tr-lg text-right">Bookings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {analyticsData.topResources.map((resource, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-slate-700">{resource.name}</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">{resource.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 text-slate-400">
                  No data available
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
