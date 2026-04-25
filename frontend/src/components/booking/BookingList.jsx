import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
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
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  approveBooking,
  cancelBooking,
  clearBookingForAdmin,
  getAllBookings,
  getAllBookingsForAnalytics,
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
  const [allBookingsForAnalytics, setAllBookingsForAnalytics] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [resourceTypeFilter, setResourceTypeFilter] = useState('')
  const [resourceIdSearch, setResourceIdSearch] = useState('')
  const [viewMode, setViewMode] = useState('bookings')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [showDownloadMenu, setShowDownloadMenu] = useState(false)
  const downloadMenuRef = useRef(null)
  const [userViewTab, setUserViewTab] = useState('list')
  const [currentMonth, setCurrentMonth] = useState(new Date())

  // Reminder system state
  const [reminders, setReminders] = useState(() => {
    const saved = localStorage.getItem('booking_reminders')
    return saved ? JSON.parse(saved) : []
  })
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [reminderBooking, setReminderBooking] = useState(null)
  const [reminderOffset, setReminderOffset] = useState('30')
  const [hoveredDay, setHoveredDay] = useState(null)
  const hoverTimeoutRef = useRef(null)

  // Persist reminders to localStorage
  useEffect(() => {
    localStorage.setItem('booking_reminders', JSON.stringify(reminders))
  }, [reminders])

  // Request notification permission on mount
  useEffect(() => {
    const requestPermission = async () => {
      if ('Notification' in window) {
        if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission()
          console.log('Notification permission:', permission)
        } else {
          console.log('Notification permission already:', Notification.permission)
        }
      } else {
        console.log('Notifications not supported')
      }
    }
    requestPermission()
  }, [])

  // Play notification sound
  const playNotificationSound = () => {
    try {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.value = 800 // 800Hz beep
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.5)
    } catch (error) {
      console.log('Sound play failed:', error)
    }
  }

  // Calculate reminder trigger time
  const getReminderTriggerTime = (reminder) => {
    const bookingDateTime = new Date(`${reminder.date}T${reminder.startTime}`)
    
    const offsets = {
      '10': 10 * 60 * 1000,
      '30': 30 * 60 * 1000,
      '60': 60 * 60 * 1000,
      '1440': 24 * 60 * 60 * 1000
    }

    const triggerTime = new Date(bookingDateTime.getTime() - (offsets[reminder.offset] || 0))
    console.log('Reminder trigger time for', reminder.resourceName, ':', triggerTime, 'Current time:', new Date())
    return triggerTime
  }

  // Check reminders every 30 seconds and trigger notifications
  useEffect(() => {
    console.log('Setting up reminder check interval, total reminders:', reminders.length)
    
    const interval = setInterval(() => {
      const now = new Date()
      console.log('Checking reminders at:', now)

      reminders.forEach((reminder) => {
        const triggerTime = getReminderTriggerTime(reminder)

        // Prevent duplicate firing - only trigger if not already triggered
        if (!reminder.triggered && now >= triggerTime) {
          console.log('TRIGGERING REMINDER:', reminder.resourceName)
          
          // Play sound
          playNotificationSound()
          
          // Show browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification('🔔 Booking Reminder', {
              body: `${reminder.resourceName} at ${reminder.startTime} on ${reminder.date}`,
              icon: '/favicon.ico',
              tag: `booking-${reminder.id}`,
              requireInteraction: true
            })
            
            // Auto-close notification after 10 seconds
            setTimeout(() => {
              notification.close()
            }, 10000)
          } else {
            console.log('Notifications not granted or not supported')
            // Fallback: show alert
            alert(`🔔 Booking Reminder: ${reminder.resourceName} at ${reminder.startTime}`)
          }

          // Mark as triggered
          setReminders(prev =>
            prev.map(r =>
              r.id === reminder.id ? { ...r, triggered: true } : r
            )
          )
        }
      })
    }, 30000) // Check every 30 seconds

    return () => {
      console.log('Clearing reminder interval')
      clearInterval(interval)
    }
  }, [reminders])

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
      if (isAllScope) {
        // For admin: fetch filtered bookings (excludes cleared) for table
        const response = await getAllBookings(statusFilter || undefined)
        setBookings(Array.isArray(response) ? response : [])

        // Also fetch all bookings including cleared for analytics
        const allResponse = await getAllBookingsForAnalytics(statusFilter || undefined)
        setAllBookingsForAnalytics(Array.isArray(allResponse) ? allResponse : [])
      } else {
        // For user: just fetch my bookings
        const response = await getMyBookings()
        setBookings(Array.isArray(response) ? response : [])
        setAllBookingsForAnalytics([])
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load bookings right now.')
    } finally {
      setIsLoading(false)
    }
  }, [isAllScope, statusFilter])

  useEffect(() => {
    loadBookings()
  }, [loadBookings])

  // Visible bookings for Admin table (backend filters cleared bookings + applies filters)
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

  // Clear booking for admin (persistent via backend)
  const handleClear = async (bookingId) => {
    setIsActionLoading(true)
    try {
      await clearBookingForAdmin(bookingId)
      await loadBookings() // Reload to reflect cleared status
      closeBookingModal()
      Swal.fire({
        title: 'Cleared',
        text: 'Booking cleared from view. Data retained for analytics.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
      })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to clear booking.')
    } finally {
      setIsActionLoading(false)
    }
  }

  // Legacy handleCancel for user cancel (still uses API)
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

  // Analytics data calculations - uses ALL bookings (including cleared ones) for accurate analytics
  const analyticsData = useMemo(() => {
    const analyticsSource = isAllScope && allBookingsForAnalytics.length > 0 ? allBookingsForAnalytics : bookings

    const total = analyticsSource.length
    const approved = analyticsSource.filter(b => b.status === 'APPROVED').length
    const pending = analyticsSource.filter(b => b.status === 'PENDING').length
    const rejected = analyticsSource.filter(b => b.status === 'REJECTED').length
    const cancelled = analyticsSource.filter(b => b.status === 'CANCELLED').length

    // Bookings by status for pie chart
    const statusData = [
      { name: 'Pending', value: pending, color: '#f59e0b' },
      { name: 'Approved', value: approved, color: '#10b981' },
      { name: 'Rejected', value: rejected, color: '#ef4444' },
      { name: 'Cancelled', value: cancelled, color: '#64748b' },
    ].filter(item => item.value > 0)

    // Bookings by resource type for bar chart (uses ALL bookings)
    const resourceTypeData = Object.entries(
      analyticsSource.reduce((acc, booking) => {
        const type = resourceTypeDisplayNames[booking.resourceType] || booking.resourceType
        acc[type] = (acc[type] || 0) + 1
        return acc
      }, {})
    ).map(([name, value]) => ({ name, value }))

    // Bookings over time (last 30 days) for line chart - FIXED
    const getLast30Days = () => {
      const days = []
      for (let i = 29; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        days.push(d.toISOString().split('T')[0])
      }
      return days
    }

    const last30Days = getLast30Days()

    const timeData = last30Days.map(date => {
      const count = analyticsSource.filter(b => {
        // Handle different date formats (YYYY-MM-DD from API)
        const bookingDate = b.date ? b.date.split('T')[0] : ''
        return bookingDate === date
      }).length

      return {
        date: date.slice(5), // Show MM-DD
        bookings: count,
      }
    })

    // Top 5 most booked resources (uses ALL bookings)
    const resourceBookings = analyticsSource.reduce((acc, booking) => {
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
  }, [bookings, allBookingsForAnalytics, isAllScope])

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

  // Export to PDF function
  const exportToPDF = () => {
    try {
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const today = new Date().toISOString().split('T')[0]

      // Header with styling
      doc.setFillColor(139, 92, 246) // Violet-500
      doc.rect(0, 0, pageWidth, 40, 'F')

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.text('Booking Analytics Report', pageWidth / 2, 25, { align: 'center' })

      // Subheader
      doc.setTextColor(100, 100, 100)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text(`Generated on: ${today}`, pageWidth / 2, 50, { align: 'center' })

      // Summary Statistics Section
      doc.setTextColor(60, 60, 60)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Summary Statistics', 14, 70)

      // Stats boxes
      const stats = [
        { label: 'Total Bookings', value: analyticsData.total, color: [59, 130, 246] },
        { label: 'Approved', value: analyticsData.approved, color: [16, 185, 129] },
        { label: 'Pending', value: analyticsData.pending, color: [245, 158, 11] },
        { label: 'Rejected', value: analyticsData.rejected, color: [239, 68, 68] },
      ]

      let xPos = 14
      stats.forEach((stat) => {
        doc.setFillColor(stat.color[0], stat.color[1], stat.color[2])
        doc.roundedRect(xPos, 78, 42, 28, 3, 3, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text(stat.value.toString(), xPos + 21, 92, { align: 'center' })
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.text(stat.label, xPos + 21, 100, { align: 'center' })
        xPos += 48
      })

      // Status Breakdown Table
      doc.setTextColor(60, 60, 60)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Status Breakdown', 14, 125)

      const statusTableData = analyticsData.statusData.map(item => [item.name, item.value])
      autoTable(doc, {
        startY: 130,
        head: [['Status', 'Count']],
        body: statusTableData,
        theme: 'grid',
        headStyles: {
          fillColor: [139, 92, 246],
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        styles: {
          fontSize: 11,
          cellPadding: 5,
        },
      })

      // Top Resources Section
      const currentY = doc.lastAutoTable.finalY + 15
      doc.setTextColor(60, 60, 60)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Top 5 Most Booked Resources', 14, currentY)

      const topResourcesData = analyticsData.topResources.map((resource, index) => [
        (index + 1).toString(),
        resource.name,
        resource.count.toString(),
      ])

      autoTable(doc, {
        startY: currentY + 5,
        head: [['#', 'Resource Name', 'Bookings']],
        body: topResourcesData,
        theme: 'grid',
        headStyles: {
          fillColor: [139, 92, 246],
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        styles: {
          fontSize: 10,
          cellPadding: 5,
        },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },
          2: { cellWidth: 30, halign: 'center' },
        },
      })

      // Resource Type Breakdown
      const resourceTypeY = doc.lastAutoTable.finalY + 15
      doc.setTextColor(60, 60, 60)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Bookings by Resource Type', 14, resourceTypeY)

      const resourceTypeData = analyticsData.resourceTypeData.map(item => [item.name, item.value])
      autoTable(doc, {
        startY: resourceTypeY + 5,
        head: [['Resource Type', 'Bookings']],
        body: resourceTypeData,
        theme: 'grid',
        headStyles: {
          fillColor: [139, 92, 246],
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        styles: {
          fontSize: 10,
          cellPadding: 5,
        },
      })

      // Footer
      const footerY = doc.internal.pageSize.getHeight() - 20
      doc.setTextColor(150, 150, 150)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'italic')
      doc.text('PAF Booking System - Analytics Report', pageWidth / 2, footerY, { align: 'center' })

      // Save PDF
      doc.save(`bookings-analytics-report-${today}.pdf`)

      Swal.fire({
        title: 'Export Complete',
        text: 'PDF analytics report has been downloaded.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
      })
    } catch (error) {
      console.error('PDF Export Error:', error)
      Swal.fire({
        title: 'Export Failed',
        text: `Failed to generate PDF: ${error.message}`,
        icon: 'error',
      })
    }
  }

  // Calendar helper functions
  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay()

    const days = []
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null)
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }
    return days
  }

  const formatDate = (year, month, day) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const groupBookingsByDate = (bookingsList) => {
    const grouped = {}
    bookingsList.forEach(booking => {
      const dateKey = booking.date?.split('T')[0] || booking.date
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(booking)
    })
    return grouped
  }

  const getStatusColors = (status) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-50 border-amber-200 text-amber-700'
      case 'APPROVED':
        return 'bg-emerald-50 border-emerald-200 text-emerald-700'
      case 'REJECTED':
        return 'bg-rose-50 border-rose-200 text-rose-700'
      default:
        return 'bg-slate-50 border-slate-200 text-slate-700'
    }
  }

  // Reminder system functions
  const openReminderModal = (booking) => {
    setReminderBooking(booking)
    // Check if reminder already exists for this booking
    const existing = reminders.find(r => r.bookingId === booking.id)
    if (existing) {
      setReminderOffset(existing.offset)
    } else {
      setReminderOffset('30')
    }
    setShowReminderModal(true)
  }

  const closeReminderModal = () => {
    setShowReminderModal(false)
    setReminderBooking(null)
    setReminderOffset('30')
  }

  const saveReminder = () => {
    if (!reminderBooking) return

    // If "Clear reminder" selected, remove existing reminder for this booking
    if (reminderOffset === '0') {
      setReminders(prev => prev.filter(r => r.bookingId !== reminderBooking.id))
      setShowReminderModal(false)
      setReminderBooking(null)

      Swal.fire({
        title: 'Reminder Cleared',
        text: 'Reminder has been removed for this booking',
        icon: 'info',
        timer: 2000,
        showConfirmButton: false
      })
      return
    }

    const offsetLabels = {
      '10': '10 minutes before',
      '30': '30 minutes before',
      '60': '1 hour before',
      '1440': '1 day before'
    }

    // Remove any existing reminder for this booking first
    const filteredReminders = reminders.filter(r => r.bookingId !== reminderBooking.id)

    const newReminder = {
      id: Date.now(),
      bookingId: reminderBooking.id,
      resourceName: reminderBooking.resourceName,
      resourceType: reminderBooking.resourceType,
      date: reminderBooking.date?.split('T')[0] || reminderBooking.date,
      startTime: reminderBooking.startTime,
      offset: reminderOffset,
      offsetLabel: offsetLabels[reminderOffset],
      triggered: false,
      createdAt: new Date().toISOString()
    }

    setReminders([...filteredReminders, newReminder])
    setShowReminderModal(false)
    setReminderBooking(null)

    Swal.fire({
      title: 'Reminder Set!',
      text: `You'll be reminded ${offsetLabels[reminderOffset]}`,
      icon: 'success',
      timer: 2000,
      showConfirmButton: false
    })
  }

  const getExistingReminder = (bookingId) => {
    return reminders.find(r => r.bookingId === bookingId)
  }

  const deleteReminder = (reminderId) => {
    setReminders(prev => prev.filter(r => r.id !== reminderId))
  }

  const getReminderOffsetLabel = (offset) => {
    const labels = {
      '10': '10 min before',
      '30': '30 min before',
      '60': '1 hour before',
      '1440': '1 day before'
    }
    return labels[offset] || `${offset} min before`
  }

  // Hover locking for calendar cells
  const handleDayHover = (dayKey) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredDay(dayKey)
    }, 150)
  }

  const handleDayLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    // Small delay before clearing to allow moving to overlay
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredDay(null)
    }, 200)
  }

  const handleOverlayEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
  }

  const handleOverlayLeave = () => {
    setHoveredDay(null)
  }

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(newDate.getMonth() + direction)
      return newDate
    })
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target)) {
        setShowDownloadMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5 sm:p-6 md:p-8">
      {/* Toggle Switch for Admin */}
      {isAllScope && (
        <div className="mb-6 flex items-center justify-start">
          <div className="flex bg-slate-100 rounded-full p-1">
            <button
              onClick={() => setViewMode('bookings')}
              className={`px-3 py-2 rounded-full text-xs font-semibold transition-all duration-200 sm:px-4 sm:text-sm ${
                viewMode === 'bookings'
                  ? 'bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Bookings
            </button>
            <button
              onClick={() => setViewMode('analytics')}
              className={`px-3 py-2 rounded-full text-xs font-semibold transition-all duration-200 sm:px-4 sm:text-sm ${
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

      {/* Toggle Switch for User (My Bookings / Calendar) */}
      {!isAllScope && (
        <div className="mb-6 flex items-center justify-start">
          <div className="flex bg-slate-100 rounded-full p-1">
            <button
              onClick={() => setUserViewTab('list')}
              className={`px-3 py-2 rounded-full text-xs font-semibold transition-all duration-200 sm:px-4 sm:text-sm ${
                userViewTab === 'list'
                  ? 'bg-gradient-to-r from-blue-500 via-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              My Bookings
            </button>
            <button
              onClick={() => setUserViewTab('calendar')}
              className={`px-3 py-2 rounded-full text-xs font-semibold transition-all duration-200 sm:px-4 sm:text-sm ${
                userViewTab === 'calendar'
                  ? 'bg-gradient-to-r from-blue-500 via-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Calendar
            </button>
          </div>
        </div>
      )}

      {/* BOOKINGS VIEW */}
      {viewMode === 'bookings' && (
        <>
          {isAllScope && (
            <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_auto]">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <label htmlFor="statusFilter" className="text-sm font-medium text-slate-700">Status</label>
                  <select
                    id="statusFilter"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200 sm:w-auto"
                  >
                    <option value="">All</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <label htmlFor="resourceTypeFilter" className="text-sm font-medium text-slate-700">Resource Type</label>
                  <select
                    id="resourceTypeFilter"
                    value={resourceTypeFilter}
                    onChange={(event) => setResourceTypeFilter(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200 sm:w-auto"
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
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200 placeholder:text-slate-400 lg:w-72"
              />
            </div>
          )}

      {errorMessage && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}

      {/* LIST VIEW */}
      {(isAllScope || userViewTab === 'list') && (
        <>
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
        </>
      )}

      {/* CALENDAR VIEW - Only for User */}
      {!isAllScope && userViewTab === 'calendar' && (
        <div className="space-y-4">
          {/* Upcoming Reminders Panel */}
          {(() => {
            const upcomingReminders = reminders
              .filter(r => new Date(r.date) >= new Date(new Date().toDateString()))
              .sort((a, b) => new Date(a.date) - new Date(b.date))
              .slice(0, 5)

            if (upcomingReminders.length === 0) return null

            return (
              <div className="rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <svg className="h-5 w-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <h4 className="font-semibold text-violet-900">Upcoming Reminders</h4>
                </div>
                <div className="space-y-2">
                  {upcomingReminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      className="flex items-center justify-between rounded-lg bg-white px-3 py-2 shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-700">{reminder.resourceName}</span>
                        <span className="text-xs text-slate-500">
                          {reminder.date} • {reminder.startTime}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-violet-600 font-medium">{reminder.offsetLabel}</span>
                        <button
                          onClick={() => deleteReminder(reminder.id)}
                          className="text-slate-400 hover:text-rose-500 transition"
                          title="Delete reminder"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Calendar Header */}
          <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-sky-100 to-blue-50 p-4 shadow-sm shadow-sky-200/50">
            <button
              onClick={() => navigateMonth(-1)}
              className="flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Prev
            </button>
            <h3 className="text-lg font-semibold text-slate-800">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <button
              onClick={() => navigateMonth(1)}
              className="flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
            >
              Next
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="rounded-2xl border border-sky-200/60 bg-white p-4 shadow-sm shadow-sky-100/50">
            {/* Weekday Headers */}
            <div className="mb-2 grid grid-cols-7 gap-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            {(() => {
              const days = getDaysInMonth(currentMonth)
              const year = currentMonth.getFullYear()
              const month = currentMonth.getMonth()
              const bookingsByDate = groupBookingsByDate(bookings)

              return (
                <div className="grid grid-cols-7 gap-1">
                  {days.map((day, index) => {
                    if (day === null) {
                      return <div key={`empty-${index}`} className="min-h-[100px] bg-slate-50/50" />
                    }

                    const dateString = formatDate(year, month, day)
                    const dayBookings = bookingsByDate[dateString] || []
                    const isToday = new Date().toISOString().split('T')[0] === dateString

                    return (
                      <div
                        key={day}
                        className={`min-h-[100px] border p-2 transition hover:bg-slate-50 ${
                          isToday ? 'border-blue-300 bg-blue-50/30' : 'border-slate-100'
                        }`}
                      >
                        <div className={`mb-1 text-right text-sm font-medium ${isToday ? 'text-blue-600' : 'text-slate-700'}`}>
                          {day}
                        </div>
                        {/* Day cell with hover locking */}
                        <div
                          className="relative min-h-[60px] cursor-pointer"
                          onMouseEnter={() => handleDayHover(`${year}-${month}-${day}`)}
                          onMouseLeave={handleDayLeave}
                        >
                          {/* Normal view - max 2 bookings */}
                          <div className="space-y-1">
                            {dayBookings.slice(0, 2).map((booking) => (
                              <div
                                key={booking.id}
                                className={`w-full cursor-default overflow-hidden rounded border px-1.5 py-1 text-left text-xs ${getStatusColors(booking.status)}`}
                              >
                                <div className="truncate font-medium">{booking.resourceName}</div>
                                <div className="text-[10px] opacity-75">
                                  {booking.startTime} - {booking.endTime}
                                </div>
                              </div>
                            ))}
                            {dayBookings.length > 2 && (
                              <div className="w-full rounded bg-slate-100 px-1.5 py-1 text-center text-xs font-medium text-slate-600">
                                +{dayBookings.length - 2} more
                              </div>
                            )}
                            {/* Reminder indicator */}
                            {(() => {
                              const dateString = formatDate(year, month, day)
                              const dayReminders = reminders.filter(r => r.date === dateString)
                              if (dayReminders.length === 0) return null
                              return (
                                <div className="mt-1 flex items-center gap-1 text-[10px] text-violet-600">
                                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span className="font-medium">{dayReminders.length}</span>
                                </div>
                              )
                            })()}
                          </div>

                          {/* Hover overlay - appears fixed above the cell, shows all bookings */}
                          {dayBookings.length > 0 && hoveredDay === `${year}-${month}-${day}` && (
                            <div
                              className="pointer-events-auto absolute bottom-full left-1/4 z-50 mb-3 flex w-[340px] -translate-x-1/2 transform flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-2xl transition-all duration-300"
                              onMouseEnter={handleOverlayEnter}
                              onMouseLeave={handleOverlayLeave}
                            >
                              {/* Invisible hover bridge connecting cell to overlay */}
                              <div className="absolute -bottom-4 left-0 right-0 h-4 bg-transparent" />
                              {/* Arrow pointing down */}
                              <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-slate-200 bg-white" />
                              {/* All bookings in this day */}
                              <div className="relative z-10 max-h-[180px] overflow-y-auto space-y-3">
                                {dayBookings.map((booking, idx) => {
                                  const statusGlow = booking.status === 'PENDING' ? 'shadow-amber-300' : booking.status === 'APPROVED' ? 'shadow-emerald-200' : 'shadow-rose-200'
                                  return (
                                    <div
                                      key={booking.id}
                                      className={`rounded-lg border-2 px-3 py-2 text-sm ${getStatusColors(booking.status)} ${statusGlow} shadow-sm`}
                                    >
                                      <div className="flex items-center justify-between gap-3">
                                        <span className="font-semibold text-sm">{booking.resourceName}</span>
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                          booking.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                          booking.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                                          'bg-rose-100 text-rose-700'
                                        }`}>
                                          {booking.status}
                                        </span>
                                      </div>
                                      <div className="mt-1.5 text-sm opacity-90 font-medium">
                                        {booking.startTime} - {booking.endTime}
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs opacity-60">{booking.resourceType}</span>
                                        {booking.status === 'APPROVED' && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              openReminderModal(booking)
                                            }}
                                            className="text-xs text-violet-600 hover:text-violet-800 font-semibold hover:underline px-2 py-1 rounded hover:bg-violet-50 transition"
                                          >
                                            🔔 Set Reminder
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>

          {/* Empty State */}
          {!isLoading && bookings.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-12 text-center">
              <svg className="mx-auto mb-3 h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-slate-600">No bookings scheduled</p>
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 rounded-xl bg-slate-50 p-3 text-xs">
            <span className="font-medium text-slate-600">Status:</span>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-amber-400" />
              <span className="text-slate-600">Pending</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-emerald-400" />
              <span className="text-slate-600">Approved</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-rose-400" />
              <span className="text-slate-600">Rejected</span>
            </div>
          </div>
        </div>
      )}

      {/* Reminder Modal */}
      {showReminderModal && reminderBooking && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-4 sm:items-center sm:py-6">
          <div className="w-full max-w-md rounded-2xl border border-violet-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Set Reminder</h3>
              <button
                onClick={closeReminderModal}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 rounded-lg bg-slate-50 p-3">
              <p className="text-sm font-medium text-slate-700">{reminderBooking.resourceName}</p>
              <p className="text-xs text-slate-500">
                {reminderBooking.date?.split('T')[0]} • {reminderBooking.startTime} - {reminderBooking.endTime}
              </p>
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Remind me before
              </label>
              <select
                value={reminderOffset}
                onChange={(e) => setReminderOffset(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
              >
                <option value="10">10 minutes before</option>
                <option value="30">30 minutes before</option>
                <option value="60">1 hour before</option>
                <option value="1440">1 day before</option>
                <option value="0">Clear reminder</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeReminderModal}
                className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={saveReminder}
                className="flex-1 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-500/30 transition hover:shadow-xl"
              >
                Save Reminder
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-4 sm:items-center sm:py-6">
          <div className="w-full max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl border border-teal-100 bg-white p-4 shadow-xl shadow-teal-900/5 sm:max-h-[calc(100dvh-3rem)] sm:p-8 md:p-10">
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

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    disabled={isActionLoading}
                    onClick={handleEditSubmit}
                    className="w-full rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    {isActionLoading ? 'Saving...' : 'Save Changes'}
                  </button>

                  <button
                    type="button"
                    disabled={isActionLoading}
                    onClick={handleCancelEdit}
                    className="w-full rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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
                            className="w-full rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() => handleReject(selectedBooking.id)}
                            className="w-full rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      <div className="relative group">
                        <button
                          type="button"
                          disabled={isActionLoading || selectedBooking.status === 'PENDING'}
                          onClick={() => selectedBooking.status !== 'PENDING' && handleClear(selectedBooking.id)}
                          className={`w-full rounded-full border px-5 py-2.5 text-sm font-semibold transition sm:w-auto ${
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
                          className="w-full rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 sm:w-auto"
                        >
                          Update
                        </button>
                      )}

                      {selectedBooking.status === 'PENDING' && (
                        <button
                          type="button"
                          disabled={isActionLoading}
                          onClick={handleDeleteFromModal}
                          className="w-full rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                        >
                          {isActionLoading ? 'Deleting...' : 'Delete'}
                        </button>
                      )}

                      {(selectedBooking.status === 'APPROVED' || selectedBooking.status === 'REJECTED') && (
                        <button
                          type="button"
                          onClick={() => navigateToTicket(selectedBooking.id)}
                          className="w-full rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700 sm:w-auto"
                        >
                          Raise Ticket
                        </button>
                      )}
                    </>
                  )}

                  <button
                    type="button"
                    onClick={closeBookingModal}
                    className="w-full rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 sm:w-auto"
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
          <div className="flex flex-col gap-4 rounded-xl bg-slate-50 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid w-full gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <label htmlFor="analyticsStatusFilter" className="text-sm font-medium text-slate-700">Status</label>
                <select
                  id="analyticsStatusFilter"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200 sm:w-auto"
                >
                  <option value="">All</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <label htmlFor="analyticsResourceTypeFilter" className="text-sm font-medium text-slate-700">Resource Type</label>
                <select
                  id="analyticsResourceTypeFilter"
                  value={resourceTypeFilter}
                  onChange={(event) => setResourceTypeFilter(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200 sm:w-auto"
                >
                  <option value="">All</option>
                  <option value="LAB">Lab</option>
                  <option value="LECTURE_HALL">Lecture Hall</option>
                  <option value="MEETING_ROOM">Meeting Room</option>
                  <option value="EQUIPMENT">Equipment</option>
                </select>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <label className="text-sm font-medium text-slate-700">Date Range</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200 sm:w-auto"
                />
                <span className="text-slate-500">to</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200 sm:w-auto"
                />
              </div>
            </div>

            {/* Download Report Dropdown */}
            <div className="relative w-full lg:w-auto" ref={downloadMenuRef}>
              <button
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white transition hover:shadow-lg hover:shadow-violet-500/30 lg:w-auto"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Report
                <svg className={`w-4 h-4 transition-transform ${showDownloadMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showDownloadMenu && (
                <div className="absolute left-0 z-10 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl lg:left-auto lg:right-0 lg:w-48">
                  <button
                    onClick={() => {
                      exportToCSV()
                      setShowDownloadMenu(false)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition border-b border-slate-100"
                  >
                    <div className="p-1.5 bg-emerald-100 rounded">
                      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="font-medium">CSV Format</p>
                      <p className="text-xs text-slate-400">Spreadsheet data</p>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      exportToPDF()
                      setShowDownloadMenu(false)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition"
                  >
                    <div className="p-1.5 bg-rose-100 rounded">
                      <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="font-medium">PDF Format</p>
                      <p className="text-xs text-slate-400">Analytics report</p>
                    </div>
                  </button>
                </div>
              )}
            </div>
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
