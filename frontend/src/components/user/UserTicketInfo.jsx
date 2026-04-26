import { useEffect, useState } from 'react'
import {
	addIncidentTicketComment,
	deleteIncidentTicketComment,
	getResourceById,
	updateIncidentTicketComment,
} from '../../api/api'

const statusBadgeClasses = {
	OPEN: 'bg-amber-100 text-amber-700',
	IN_PROGRESS: 'bg-blue-100 text-blue-700',
	RESOLVED: 'bg-emerald-100 text-emerald-700',
	CLOSED: 'bg-slate-200 text-slate-700',
	REJECTED: 'bg-rose-100 text-rose-700',
}

const priorityBadgeClasses = {
	LOW: 'bg-slate-100 text-slate-700',
	MEDIUM: 'bg-cyan-100 text-cyan-700',
	HIGH: 'bg-orange-100 text-orange-700',
	XHIGH: 'bg-rose-100 text-rose-700',
}

function formatLabel(value) {
	if (!value) return ''
	return value
		.toLowerCase()
		.split('_')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ')
}

function getSLAStatus(ticket) {
	if (!ticket || !ticket.createdAt) return null;

	const createdTime = new Date(ticket.createdAt).getTime();
	const isResolved = ['RESOLVED', 'CLOSED', 'REJECTED'].includes(ticket.status);
	const endTime = isResolved && ticket.updatedAt
		? new Date(ticket.updatedAt).getTime()
		: Date.now();

	const diffHours = (endTime - createdTime) / (1000 * 60 * 60);
	const displayHours = diffHours < 1 ? '< 1' : Math.round(diffHours);

	let firstResponseText = null;
	if (Array.isArray(ticket.comments) && ticket.comments.length > 0) {
		// Find first comment not authored by the ticket creator
		const firstResponse = ticket.comments.find((c) => c.authorUserId !== ticket.userId);
		if (firstResponse && firstResponse.createdAt) {
			const responseTime = new Date(firstResponse.createdAt).getTime();
			const respDiff = (responseTime - createdTime) / (1000 * 60 * 60);
			firstResponseText = `1st response: ${respDiff < 1 ? '< 1' : Math.round(respDiff)}h`;
		}
	}

	let style = 'bg-emerald-100 text-emerald-700 border border-emerald-200';
	let text = `SLA On Track (${displayHours}h open)`;

	if (isResolved) {
		style = 'bg-slate-100 text-slate-600 border border-slate-200';
		text = `Resolved in ${displayHours}h`;
	} else if (diffHours > 48) {
		style = 'bg-rose-100 text-rose-700 border border-rose-300 animate-pulse';
		text = `SLA Breached (${displayHours}h open)`;
	} else if (diffHours > 24) {
		style = 'bg-orange-100 text-orange-700 border border-orange-300';
		text = `SLA Warning (${displayHours}h open)`;
	}

	return { style, text, subText: firstResponseText };
}

function TicketAttachments({ attachments }) {
	if (!attachments?.length) {
		return null
	}

	return (
		<div className="grid gap-3 sm:grid-cols-2">
			{attachments.map((attachment) => (
				<a
					key={attachment.id}
					href={attachment.url}
					target="_blank"
					rel="noreferrer"
					className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition hover:-translate-y-0.5 hover:border-slate-300"
				>
					<img src={attachment.url} alt="Ticket attachment" className="h-40 w-full object-cover" />
				</a>
			))}
		</div>
	)
}

function TicketComments({ ticket, currentUserEmail, onRefresh }) {
	const [body, setBody] = useState('')
	const [editingCommentId, setEditingCommentId] = useState(null)
	const [editingBody, setEditingBody] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [errorMessage, setErrorMessage] = useState('')

	useEffect(() => {
		setBody('')
		setEditingCommentId(null)
		setEditingBody('')
		setErrorMessage('')
	}, [ticket?.id])

	const comments = Array.isArray(ticket?.comments) ? ticket.comments : []

	const handleAdd = async () => {
		if (!body.trim()) {
			setErrorMessage('Comment is required.')
			return
		}

		setIsSubmitting(true)
		setErrorMessage('')
		try {
			await addIncidentTicketComment(ticket.id, { body: body.trim() })
			setBody('')
			await onRefresh()
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : 'Unable to add comment.')
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleEdit = async (commentId) => {
		if (!editingBody.trim()) {
			setErrorMessage('Comment is required.')
			return
		}

		setIsSubmitting(true)
		setErrorMessage('')
		try {
			await updateIncidentTicketComment(commentId, { body: editingBody.trim() })
			setEditingCommentId(null)
			setEditingBody('')
			await onRefresh()
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : 'Unable to update comment.')
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleDelete = async (commentId) => {
		const confirmed = window.confirm('Delete this comment?')
		if (!confirmed) return

		setIsSubmitting(true)
		setErrorMessage('')
		try {
			await deleteIncidentTicketComment(commentId)
			await onRefresh()
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : 'Unable to delete comment.')
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<div className="space-y-4">
			<div>
				<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Comments</p>
				<h3 className="mt-1 text-lg font-semibold text-slate-900">Conversation</h3>
			</div>

			<div className="space-y-3">
				{comments.length === 0 ? (
					<div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
						No comments yet.
					</div>
				) : comments.map((comment) => {
					const isEditing = editingCommentId === comment.id
					const isOwnComment = comment.authorName && currentUserEmail && comment.authorName.toLowerCase() === currentUserEmail.toLowerCase()

					return (
						<div key={comment.id} className="rounded-2xl border border-slate-200 bg-white p-4">
							<div className="flex flex-wrap items-center justify-between gap-2">
								<div>
									<p className="text-sm font-semibold text-slate-900">{comment.authorName}</p>
									<p className="text-xs text-slate-500">{comment.createdAt}</p>
								</div>
								{(comment.editable || comment.deletable || isOwnComment) && (
									<div className="flex gap-2">
										<button
											type="button"
											onClick={() => {
												setEditingCommentId(comment.id)
												setEditingBody(comment.body)
											}}
											className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
										>
											Edit
										</button>
										<button
											type="button"
											onClick={() => handleDelete(comment.id)}
											className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
										>
											Delete
										</button>
									</div>
								)}
							</div>

							{isEditing ? (
								<div className="mt-3 space-y-3">
									<textarea
										value={editingBody}
										onChange={(event) => setEditingBody(event.target.value)}
										rows={3}
										className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
									/>
									<div className="flex gap-2">
										<button
											type="button"
											disabled={isSubmitting}
											onClick={() => handleEdit(comment.id)}
											className="rounded-full bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
										>
											Save
										</button>
										<button
											type="button"
											onClick={() => setEditingCommentId(null)}
											className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
										>
											Cancel
										</button>
									</div>
								</div>
							) : (
								<p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">{comment.body}</p>
							)}
						</div>
					)
				})}
			</div>

			<div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
				<label className="grid gap-2 text-sm font-medium text-slate-700">
					Add a comment
					<textarea
						value={body}
						onChange={(event) => setBody(event.target.value)}
						rows={3}
						placeholder="Share an update, question, or note for the team."
						className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
					/>
				</label>

				{errorMessage && <p className="text-sm text-rose-600">{errorMessage}</p>}

				<button
					type="button"
					disabled={isSubmitting}
					onClick={handleAdd}
					className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
				>
					{isSubmitting ? 'Posting...' : 'Post comment'}
				</button>
			</div>
		</div>
	)
}

export default function UserTicketInfo({
	ticket,
	isAdminScope = false,
	currentUserEmail = '',
	currentAdminUser = null,
	adminUsers = [],
	assignTechnicianId,
	onAssignTechnicianIdChange,
	onAssign,
	rejectReason,
	onRejectReasonChange,
	onReject,
	resolutionNotes,
	onResolutionNotesChange,
	onResolve,
	onClose,
	onRefresh,
	isSubmitting = false,
}) {
	const [resolvedResource, setResolvedResource] = useState(null)
	const [_currentTimeTick, setCurrentTimeTick] = useState(0)

	// Force a re-render every minute to keep the SLA timer completely accurate
	useEffect(() => {
		if (ticket && ['OPEN', 'IN_PROGRESS'].includes(ticket.status)) {
			const interval = setInterval(() => setCurrentTimeTick((t) => t + 1), 60000)
			return () => clearInterval(interval)
		}
	}, [ticket])

	useEffect(() => {
		let isMounted = true

		if (!ticket?.resourceId) {
			return () => {
				isMounted = false
			}
		}

		const loadResourceName = async () => {
			try {
				const resource = await getResourceById(ticket.resourceId)
				if (isMounted) {
					setResolvedResource({
						id: Number(ticket.resourceId),
						name: resource?.name ?? '',
					})
				}
			} catch {
				// Keep fallback rendering with Resource ID when name lookup fails.
			}
		}

		loadResourceName()

		return () => {
			isMounted = false
		}
	}, [ticket?.resourceId])

	if (!ticket) {
		return (
			<div className="rounded-3xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600">
				Select a ticket to view details.
			</div>
		)
	}

	const slaInfo = getSLAStatus(ticket)

	return (
		<div className="space-y-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
			{/** Resource-related tickets should show both location and resource details. */}
			{(() => {
				const isResourceTicket = ticket.category === 'RESOURCE'
				const hasLocation = Boolean(ticket.location)
				const hasResource = Boolean(ticket.resourceId)
				const resolvedResourceName = resolvedResource?.id === Number(ticket.resourceId)
					? resolvedResource?.name
					: ''
				const resourceLabel = resolvedResourceName
					? `Resource: ${resolvedResourceName}`
					: (hasResource ? `Resource ID: ${ticket.resourceId}` : null)
				const locationResourceText = isResourceTicket
					? [
						hasLocation ? ticket.location : null,
						resourceLabel,
					].filter(Boolean).join(' | ')
					: (ticket.location || ticket.resourceId || 'Not provided')

				return (
					<>
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Ticket details</p>
					<h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{ticket.title}</h3>
					<p className="mt-1 text-sm text-slate-500">Ticket #{ticket.id}</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClasses[ticket.status] ?? 'bg-slate-100 text-slate-700'}`}>
						{formatLabel(ticket.status)}
					</span>
					<span className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityBadgeClasses[ticket.priority] ?? 'bg-slate-100 text-slate-700'}`}>
						{formatLabel(ticket.priority)}
					</span>
					{slaInfo && (
						<span className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${slaInfo.style}`}>
							<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							{slaInfo.text}
						</span>
					)}
					{slaInfo?.subText && (
						<span className="flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
							<svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
							</svg>
							{slaInfo.subText}
						</span>
					)}
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<div className="rounded-2xl bg-white p-4">
					<p className="text-xs uppercase tracking-wide text-slate-400">Reason</p>
					<p className="mt-1 text-sm font-semibold text-slate-900">{formatLabel(ticket.category)}</p>
				</div>
				<div className="rounded-2xl bg-white p-4">
					<p className="text-xs uppercase tracking-wide text-slate-400">Location / Resource</p>
					<p className="mt-1 text-sm font-semibold text-slate-900">
						{locationResourceText || 'Not provided'}
					</p>
				</div>
				<div className="rounded-2xl bg-white p-4 sm:col-span-2">
					<p className="text-xs uppercase tracking-wide text-slate-400">Description</p>
					<p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-700">{ticket.description}</p>
				</div>
			</div>
					</>
				)
			})()}

			<TicketAttachments attachments={ticket.attachments} />

			{ticket.rejectionReason && (
				<div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
					<p className="font-semibold">Rejected</p>
					<p className="mt-1 whitespace-pre-line">{ticket.rejectionReason}</p>
				</div>
			)}

			{ticket.resolutionNotes && (
				<div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
					<p className="font-semibold">Resolution notes</p>
					<p className="mt-1 whitespace-pre-line">{ticket.resolutionNotes}</p>
				</div>
			)}

			<div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
				<div className="grid gap-3 sm:grid-cols-2">
					<div>
						<p className="text-xs uppercase tracking-wide text-slate-400">Contact name</p>
						<p className="mt-1 font-medium text-slate-900">{ticket.preferredContactName || 'Not provided'}</p>
					</div>
					<div>
						<p className="text-xs uppercase tracking-wide text-slate-400">Contact email</p>
						<p className="mt-1 font-medium text-slate-900">{ticket.preferredContactEmail || 'Not provided'}</p>
					</div>
					<div>
						<p className="text-xs uppercase tracking-wide text-slate-400">Contact phone</p>
						<p className="mt-1 font-medium text-slate-900">{ticket.preferredContactPhone || 'Not provided'}</p>
					</div>
					<div>
						<p className="text-xs uppercase tracking-wide text-slate-400">Updated</p>
						<p className="mt-1 font-medium text-slate-900">{ticket.updatedAt}</p>
					</div>
				</div>
			</div>

			{isAdminScope && ticket.status === 'OPEN' && (
				<div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
					<p className="text-sm font-semibold text-slate-900">Admin actions</p>
					<div className="grid gap-3 sm:grid-cols-[1fr_auto]">
						<select
							value={assignTechnicianId}
							onChange={(event) => onAssignTechnicianIdChange?.(event.target.value)}
							className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
						>
							<option value="">Assign technician</option>
							{adminUsers.map((user) => (
								<option key={user.id} value={user.id}>{user.fullName || user.email}</option>
							))}
						</select>
						<button
							type="button"
							disabled={isSubmitting || !assignTechnicianId}
							onClick={onAssign}
							className="rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
						>
							Assign
						</button>
					</div>
					<div className="space-y-3">
						<textarea
							value={rejectReason}
							onChange={(event) => onRejectReasonChange?.(event.target.value)}
							rows={3}
							placeholder="Reason for rejection"
							className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
						/>
						<button
							type="button"
							disabled={isSubmitting}
							onClick={onReject}
							className="rounded-full border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
						>
							Reject
						</button>
					</div>
				</div>
			)}

			{isAdminScope && ticket.status === 'IN_PROGRESS' && ticket.assignedToUserId === currentAdminUser?.id && (
				<div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
					<p className="text-sm font-semibold text-slate-900">Resolution</p>
					<textarea
						value={resolutionNotes}
						onChange={(event) => onResolutionNotesChange?.(event.target.value)}
						rows={4}
						placeholder="Add resolution notes before marking the ticket as resolved."
						className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
					/>
					<button
						type="button"
						disabled={isSubmitting}
						onClick={onResolve}
						className="rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
					>
						Mark resolved
					</button>
				</div>
			)}

			{!isAdminScope && ticket.canClose && (
				<button
					type="button"
					disabled={isSubmitting}
					onClick={onClose}
					className="rounded-full border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:opacity-60"
				>
					Close ticket
				</button>
			)}

			<TicketComments ticket={ticket} currentUserEmail={currentUserEmail} onRefresh={onRefresh} />
		</div>
	)
}
