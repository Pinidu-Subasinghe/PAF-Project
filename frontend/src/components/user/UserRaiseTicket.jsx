import { useEffect, useState } from 'react'
import { createIncidentTicket, getResources } from '../../api/api'

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

function buildInitialForm(session, booking) {
	return {
		resourceId: booking?.resourceId ? String(booking.resourceId) : '',
		location: '',
		category: 'BOOKING',
		title: '',
		description: '',
		priority: 'MEDIUM',
		preferredContactName: session?.fullName ?? '',
		preferredContactEmail: session?.email ?? '',
		preferredContactPhone: '',
	}
}

export default function UserRaiseTicket({ isOpen, booking, session, onClose, onCreated }) {
	const [resources, setResources] = useState([])
	const [form, setForm] = useState(() => buildInitialForm(session, booking))
	const [attachments, setAttachments] = useState([])
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [errorMessage, setErrorMessage] = useState('')

	useEffect(() => {
		if (!isOpen) {
			return
		}

		setForm(buildInitialForm(session, booking))
		setAttachments([])
		setErrorMessage('')
	}, [booking, isOpen, session])

	useEffect(() => {
		if (!isOpen) {
			return
		}

		let isMounted = true

		const loadResources = async () => {
			try {
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
	}, [isOpen])

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
		setForm((current) => ({ ...current, [name]: value }))
	}

	const handleSubmit = async (event) => {
		event.preventDefault()

		if (!form.title.trim() || !form.description.trim()) {
			setErrorMessage('Title and description are required.')
			return
		}

		if (!String(form.resourceId).trim() && !form.location.trim()) {
			setErrorMessage('Select a resource or enter a location.')
			return
		}

		if (attachments.length > 3) {
			setErrorMessage('You can upload up to 3 image attachments.')
			return
		}

		setIsSubmitting(true)
		setErrorMessage('')

		try {
			await createIncidentTicket(
				{
					resourceId: form.resourceId ? Number(form.resourceId) : null,
					location: form.location.trim() || null,
					category: form.category,
					title: form.title.trim(),
					description: form.description.trim(),
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

				{booking && (
					<div className="border-b border-slate-100 bg-slate-50 px-6 py-4 sm:px-8">
						<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Related booking</p>
						<div className="mt-3 grid gap-3 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
							<div>
								<p className="text-xs uppercase tracking-wide text-slate-400">Booking</p>
								<p className="mt-1 font-semibold text-slate-900">#{booking.id}</p>
							</div>
							<div>
								<p className="text-xs uppercase tracking-wide text-slate-400">Resource</p>
								<p className="mt-1 font-semibold text-slate-900">{booking.resourceId ?? 'Not provided'}</p>
							</div>
							<div>
								<p className="text-xs uppercase tracking-wide text-slate-400">Date</p>
								<p className="mt-1 font-semibold text-slate-900">{booking.date}</p>
							</div>
							<div>
								<p className="text-xs uppercase tracking-wide text-slate-400">Time</p>
								<p className="mt-1 font-semibold text-slate-900">{booking.startTime} - {booking.endTime}</p>
							</div>
						</div>
						{booking.purpose && (
							<p className="mt-3 text-sm text-slate-600">
								<span className="font-semibold text-slate-900">Purpose:</span> {booking.purpose}
							</p>
						)}
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
							Resource
							<select
								name="resourceId"
								value={form.resourceId}
								onChange={handleChange}
								className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
							>
								<option value="">Select a resource if relevant</option>
								{resources.map((resource) => (
									<option key={resource.id} value={resource.id}>
										{resource.name} - {resource.location}
									</option>
								))}
							</select>
						</label>

						<label className="grid gap-2 text-sm font-medium text-slate-700">
							Location
							<input
								name="location"
								value={form.location}
								onChange={handleChange}
								placeholder="Building, room, or venue"
								className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
							/>
						</label>
					</div>

					<label className="grid gap-2 text-sm font-medium text-slate-700">
						Title
						<input
							name="title"
							value={form.title}
							onChange={handleChange}
							placeholder="Short summary of the issue"
							className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
						/>
					</label>

					<label className="grid gap-2 text-sm font-medium text-slate-700">
						Description
						<textarea
							name="description"
							value={form.description}
							onChange={handleChange}
							rows={5}
							placeholder="Describe what happened and what you expected to happen."
							className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
						/>
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
								className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
							/>
						</label>
					</div>

					<label className="grid gap-2 text-sm font-medium text-slate-700">
						Attachments
						<input
							type="file"
							accept="image/*"
							multiple
							onChange={(event) => setAttachments(Array.from(event.target.files ?? []).slice(0, 3))}
							className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-white"
						/>
						<span className="text-xs text-slate-500">Up to 3 images for evidence or screenshots.</span>
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
