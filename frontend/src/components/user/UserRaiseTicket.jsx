import { useEffect, useState } from 'react'
import { createIncidentTicket, getMyBookings, getResourceById, getResources } from '../../api/api'

const categoryOptions = [
{ value: 'BOOKING', label: 'About Booking' },
{ value: 'RESOURCE', label: 'About Resource' },
]

const priorityOptions = [
{ value: 'LOW', label: 'Low' },
{ value: 'MEDIUM', label: 'Medium' },
{ value: 'HIGH', label: 'High' },
{ value: 'XHIGH', label: 'Xhigh' },
]

const bookingIssueOptions = [
{ value: 'EXTRA_EQUIPMENT', label: 'Need extra equipment' },
{ value: 'CANCEL_BOOKING', label: 'Want to cancel the booking' },
{ value: 'CHANGE_TIME', label: 'Need to change date or time' },
{ value: 'CHANGE_CAPACITY', label: 'Need to update attendee count' },
{ value: 'OTHER_BOOKING', label: 'Other booking-related issue' },
]

function buildInitialForm(session, booking) {
return {
resourceId: booking?.resourceId ? String(booking.resourceId) : '',
location: booking?.location ?? '',
category: 'BOOKING',
bookingIssueType: '',
title: '',
description: '',
priority: 'MEDIUM',
preferredContactName: session?.fullName ?? '',
preferredContactEmail: session?.email ?? '',
preferredContactPhone: '',
}
}

function resolveBookingId(booking) {
if (typeof booking === 'number') {
return booking
}
if (typeof booking === 'string' && booking.trim() !== '' && Number.isFinite(Number(booking))) {
return Number(booking)
}

if (booking && typeof booking === 'object' && booking.id) {
return Number(booking.id)
}

return null
}

function getBookingIssueLabel(issueType) {
return bookingIssueOptions.find((option) => option.value === issueType)?.label ?? issueType
}

function validateTitle(value) {
const trimmed = value.trim()
if (!trimmed) {
return 'Title is required.'
}
if (trimmed.length < 10 || trimmed.length > 55) {
return 'Title must be between 10 and 55 characters.'
}
if (!/^[A-Za-z0-9 ]+$/.test(trimmed)) {
return 'Title can contain only letters, numbers, and spaces.'
}
return ''
}

function validateDescription(value) {
const trimmed = value.trim()
if (!trimmed) {
return 'Description is required.'
}
if (trimmed.length > 100) {
return 'Description must be at most 100 characters.'
}
return ''
}

function validatePhone(value) {
const trimmed = value.trim()
if (!trimmed) {
return ''
}
if (!/^0\d{9}$/.test(trimmed)) {
return 'Phone number must start with 0 and contain exactly 10 digits.'
}
return ''
}

function validateAttachments(files) {
if (!Array.isArray(files) || files.length === 0) {
return ''
}
if (files.length > 3) {
return 'You can upload up to 3 image attachments.'
}

const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png']
const allowedExtensions = ['jpg', 'jpeg', 'png']
const hasInvalidFile = files.some((file) => {
const extension = file?.name?.split('.').pop()?.toLowerCase()
const isMimeAllowed = allowedMimeTypes.includes((file?.type ?? '').toLowerCase())
const isExtensionAllowed = allowedExtensions.includes(extension)
return !isMimeAllowed && !isExtensionAllowed
})

if (hasInvalidFile) {
return 'Only JPG, JPEG, and PNG images are allowed.'
}

return ''
}

function validateForm(nextForm, nextAttachments) {
const errors = {}

const titleError = validateTitle(nextForm.title)
if (titleError) {
errors.title = titleError
}

const descriptionError = validateDescription(nextForm.description)
if (descriptionError) {
errors.description = descriptionError
}

if (nextForm.category === 'BOOKING' && !nextForm.bookingIssueType) {
errors.bookingIssueType = 'Please select a booking-related reason.'
}

if (nextForm.category === 'RESOURCE' && !String(nextForm.resourceId).trim() && !nextForm.location.trim()) {
errors.resourceId = 'Select a resource or enter a location.'
}

const phoneError = validatePhone(nextForm.preferredContactPhone)
if (phoneError) {
errors.preferredContactPhone = phoneError
}

const attachmentsError = validateAttachments(nextAttachments)
if (attachmentsError) {
errors.attachments = attachmentsError
}

return errors
}

export default function UserRaiseTicket({ isOpen, booking, session, onClose, onCreated }) {
const [resources, setResources] = useState([])
const [form, setForm] = useState(() => buildInitialForm(session, booking))
const [relatedBooking, setRelatedBooking] = useState(null)
const [attachments, setAttachments] = useState([])
const [fieldErrors, setFieldErrors] = useState({})
const [hasSubmitted, setHasSubmitted] = useState(false)
const [isSubmitting, setIsSubmitting] = useState(false)
const [errorMessage, setErrorMessage] = useState('')
const relatedResourceId = relatedBooking?.resourceId ? Number(relatedBooking.resourceId) : null
const isLocationLocked = Boolean(resolveBookingId(booking))

useEffect(() => {
if (!isOpen) {
return
}

if (booking && typeof booking === 'object') {
setRelatedBooking(booking)
setForm(buildInitialForm(session, booking))
} else {
setRelatedBooking(null)
setForm(buildInitialForm(session, null))
}

setAttachments([])
setFieldErrors({})
setHasSubmitted(false)
setErrorMessage('')
}, [booking, isOpen, session])

useEffect(() => {
if (!isOpen) {
return
}

const bookingId = resolveBookingId(booking)
if (!bookingId || (booking && typeof booking === 'object')) {
return
}

let isMounted = true

const loadRelatedBooking = async () => {
try {
const response = await getMyBookings()
if (!isMounted) {
return
}

const bookings = Array.isArray(response) ? response : []
const matchedBooking = bookings.find((item) => Number(item.id) === Number(bookingId))
if (matchedBooking) {
setRelatedBooking(matchedBooking)
setForm((current) => ({
...current,
resourceId: matchedBooking.resourceId ? String(matchedBooking.resourceId) : current.resourceId,
location: matchedBooking.location ?? current.location,
}))
}
} catch {
// Keep form usable even if related booking lookup fails.
}
}

loadRelatedBooking()

return () => {
isMounted = false
}
}, [booking, isOpen])

useEffect(() => {
if (!isOpen) {
return
}

let isMounted = true

const loadResources = async () => {
try {
if (relatedResourceId) {
let matchedResource = null

try {
matchedResource = await getResourceById(relatedResourceId)
} catch {
const response = await getResources()
const allResources = Array.isArray(response) ? response : []
matchedResource = allResources.find((item) => Number(item.id) === Number(relatedResourceId)) ?? null
}

if (isMounted) {
setResources(matchedResource ? [matchedResource] : [])
const resolvedLocation = matchedResource?.location ?? ''
if (resolvedLocation) {
setForm((current) => ({
...current,
location: isLocationLocked || !current.location?.trim() ? resolvedLocation : current.location,
}))
}
}
return
}

const response = await getResources()
if (isMounted) {
setResources(Array.isArray(response) ? response : [])
}
} catch {
if (isMounted) {
setResources([])
}
}
}

loadResources()

return () => {
isMounted = false
}
}, [isOpen, relatedResourceId, isLocationLocked])

useEffect(() => {
if (form.category !== 'RESOURCE' || !relatedResourceId) {
return
}

setForm((current) => ({
...current,
resourceId: String(relatedResourceId),
}))
}, [form.category, relatedResourceId])

useEffect(() => {
const handleEscape = (event) => {
if (event.key === 'Escape' && isOpen) {
onClose()
}
}

window.addEventListener('keydown', handleEscape)
return () => window.removeEventListener('keydown', handleEscape)
}, [isOpen, onClose])

if (!isOpen) {
return null
}

const handleChange = (event) => {
const { name, value } = event.target

if (name === 'category') {
const nextForm = {
...form,
category: value,
bookingIssueType: value === 'BOOKING' ? form.bookingIssueType : '',
resourceId: value === 'RESOURCE' && relatedResourceId ? String(relatedResourceId) : form.resourceId,
}
setForm(nextForm)
if (hasSubmitted) {
setFieldErrors(validateForm(nextForm, attachments))
}
return
}

		if (name === 'preferredContactPhone') {
			const digitsOnly = value.replace(/\D/g, '').slice(0, 10)
			const phoneForm = { ...form, preferredContactPhone: digitsOnly }
			setForm(phoneForm)
			if (hasSubmitted) {
				setFieldErrors(validateForm(phoneForm, attachments))
			}
			return
		}

		const nextForm = { ...form, [name]: value }
setForm(nextForm)
if (hasSubmitted) {
setFieldErrors(validateForm(nextForm, attachments))
}
}

const handleAttachmentsChange = (event) => {
const nextAttachments = Array.from(event.target.files ?? [])
setAttachments(nextAttachments)
if (hasSubmitted) {
setFieldErrors(validateForm(form, nextAttachments))
}
}

const handleSubmit = async (event) => {
event.preventDefault()
setHasSubmitted(true)

const validationErrors = validateForm(form, attachments)
setFieldErrors(validationErrors)
if (Object.keys(validationErrors).length > 0) {
setErrorMessage('Please fix the highlighted fields and try again.')
return
}

setIsSubmitting(true)
setErrorMessage('')

const bookingIssuePrefix = form.category === 'BOOKING' && form.bookingIssueType
? `[Booking issue: ${getBookingIssueLabel(form.bookingIssueType)}] `
: ''

try {
await createIncidentTicket(
{
resourceId: form.category === 'RESOURCE' && form.resourceId ? Number(form.resourceId) : null,
location: form.location.trim() || null,
category: form.category,
title: form.title.trim(),
description: `${bookingIssuePrefix}${form.description.trim()}`,
priority: form.priority,
preferredContactName: form.preferredContactName.trim() || null,
preferredContactEmail: form.preferredContactEmail.trim() || null,
preferredContactPhone: form.preferredContactPhone.trim() || null,
},
attachments,
)

onCreated?.()
onClose()
} catch (error) {
setErrorMessage(error instanceof Error ? error.message : 'Unable to create the ticket.')
} finally {
setIsSubmitting(false)
}
}

return (
<div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/55 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-6">
<div className="flex min-h-full items-start justify-center sm:items-center">
<div className="flex w-full max-w-3xl max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20 sm:max-h-[calc(100vh-3rem)]">
<div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 sm:px-8">
<div>
<p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Raise ticket</p>
<h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Create incident ticket</h2>
<p className="mt-2 text-sm text-slate-600">
Open a support request without leaving the bookings screen.
</p>
</div>
<button
type="button"
onClick={onClose}
className="rounded-full border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
>
Close
</button>
</div>

{resolveBookingId(booking) && (
<div className="border-b border-slate-100 bg-slate-50 px-6 py-4 sm:px-8">
<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Related booking</p>
<div className="mt-3 grid gap-3 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
<div>
<p className="text-xs uppercase tracking-wide text-slate-400">Booking</p>
<p className="mt-1 font-semibold text-slate-900">#{relatedBooking?.id ?? resolveBookingId(booking)}</p>
</div>
<div>
<p className="text-xs uppercase tracking-wide text-slate-400">Resource</p>
<p className="mt-1 font-semibold text-slate-900">{relatedBooking?.resourceName ?? relatedBooking?.resourceId ?? 'Not provided'}</p>
</div>
<div>
<p className="text-xs uppercase tracking-wide text-slate-400">Date</p>
<p className="mt-1 font-semibold text-slate-900">{relatedBooking?.date ?? '-'}</p>
</div>
<div>
<p className="text-xs uppercase tracking-wide text-slate-400">Time</p>
<p className="mt-1 font-semibold text-slate-900">{relatedBooking?.startTime && relatedBooking?.endTime ? `${relatedBooking.startTime} - ${relatedBooking.endTime}` : '-'}</p>
</div>
</div>
</div>
)}

<div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
<form className="grid gap-5" onSubmit={handleSubmit}>
<div className="grid gap-5 md:grid-cols-2">
<label className="grid gap-2 text-sm font-medium text-slate-700">
Ticket reason
<select
name="category"
value={form.category}
onChange={handleChange}
className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
>
{categoryOptions.map((option) => (
<option key={option.value} value={option.value}>{option.label}</option>
))}
</select>
</label>

<label className="grid gap-2 text-sm font-medium text-slate-700">
Priority
<select
name="priority"
value={form.priority}
onChange={handleChange}
className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
>
{priorityOptions.map((option) => (
<option key={option.value} value={option.value}>{option.label}</option>
))}
</select>
</label>
</div>

<div className="grid gap-5 md:grid-cols-2">
<label className="grid gap-2 text-sm font-medium text-slate-700">
{form.category === 'BOOKING' ? 'Booking issue' : 'Resource'}
{form.category === 'BOOKING' ? (
<select
name="bookingIssueType"
value={form.bookingIssueType}
onChange={handleChange}
className={`rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:ring-2 ${fieldErrors.bookingIssueType ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200' : 'border-slate-300 focus:border-teal-500 focus:ring-teal-200'}`}
>
<option value="">Select a booking-related reason</option>
{bookingIssueOptions.map((option) => (
<option key={option.value} value={option.value}>{option.label}</option>
))}
</select>
) : (
<select
name="resourceId"
value={form.resourceId}
onChange={handleChange}
disabled={Boolean(relatedResourceId)}
className={`rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 ${fieldErrors.resourceId ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200' : 'border-slate-300 focus:border-teal-500 focus:ring-teal-200'}`}
>
<option value="">Select a resource if relevant</option>
{resources.map((resource) => (
<option key={resource.id} value={resource.id}>
{resource.name}
</option>
))}
</select>
)}
{fieldErrors.bookingIssueType && (
<span className="text-xs text-rose-600">{fieldErrors.bookingIssueType}</span>
)}
{fieldErrors.resourceId && (
<span className="text-xs text-rose-600">{fieldErrors.resourceId}</span>
)}
</label>

<label className="grid gap-2 text-sm font-medium text-slate-700">
Location
<input
name="location"
value={form.location}
onChange={handleChange}
disabled={isLocationLocked}
placeholder="Building, room, or venue"
className={`rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 ${fieldErrors.resourceId ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200' : 'border-slate-300 focus:border-teal-500 focus:ring-teal-200'}`}
/>
{fieldErrors.resourceId && (
<span className="text-xs text-rose-600">{fieldErrors.resourceId}</span>
)}
</label>
</div>

<label className="grid gap-2 text-sm font-medium text-slate-700">
Title
<input
name="title"
value={form.title}
onChange={handleChange}
placeholder="Short summary of the issue"
className={`rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:ring-2 ${fieldErrors.title ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200' : 'border-slate-300 focus:border-teal-500 focus:ring-teal-200'}`}
/>
{fieldErrors.title && <span className="text-xs text-rose-600">{fieldErrors.title}</span>}
</label>

<label className="grid gap-2 text-sm font-medium text-slate-700">
Description
<textarea
name="description"
value={form.description}
onChange={handleChange}
rows={5}
maxLength={100}
placeholder="Describe what happened and what you expected to happen."
className={`rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:ring-2 ${fieldErrors.description ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200' : 'border-slate-300 focus:border-teal-500 focus:ring-teal-200'}`}
/>
{fieldErrors.description && <span className="text-xs text-rose-600">{fieldErrors.description}</span>}
</label>

<div className="grid gap-5 md:grid-cols-3">
<label className="grid gap-2 text-sm font-medium text-slate-700">
Preferred contact name
<input
name="preferredContactName"
value={form.preferredContactName}
onChange={handleChange}
className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
/>
</label>
<label className="grid gap-2 text-sm font-medium text-slate-700">
Preferred contact email
<input
name="preferredContactEmail"
value={form.preferredContactEmail}
onChange={handleChange}
className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
/>
</label>
<label className="grid gap-2 text-sm font-medium text-slate-700">
Preferred contact phone
<input
name="preferredContactPhone"
value={form.preferredContactPhone}
onChange={handleChange}
										maxLength={10}
										inputMode="numeric"
className={`rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:ring-2 ${fieldErrors.preferredContactPhone ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200' : 'border-slate-300 focus:border-teal-500 focus:ring-teal-200'}`}
/>
{fieldErrors.preferredContactPhone && <span className="text-xs text-rose-600">{fieldErrors.preferredContactPhone}</span>}
</label>
</div>

<label className="grid gap-2 text-sm font-medium text-slate-700">
Attachments
<input
type="file"
accept=".jpg,.jpeg,.png,image/jpeg,image/png"
multiple
onChange={handleAttachmentsChange}
className={`rounded-2xl border bg-white px-4 py-3 text-sm outline-none file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-white ${fieldErrors.attachments ? 'border-rose-300' : 'border-slate-300'}`}
/>
<span className="text-xs text-slate-500">Up to 3 images for evidence or screenshots.</span>
{fieldErrors.attachments && <span className="text-xs text-rose-600">{fieldErrors.attachments}</span>}
</label>

{errorMessage && (
<div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
{errorMessage}
</div>
)}

<div className="flex flex-wrap items-center justify-end gap-3 pt-1">
<button
type="button"
onClick={onClose}
className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
>
Cancel
</button>
<button
type="submit"
disabled={isSubmitting}
className="rounded-full bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
>
{isSubmitting ? 'Submitting...' : 'Submit ticket'}
</button>
</div>
</form>
</div>
</div>
</div>
</div>
)
}
