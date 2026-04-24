import { useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import {
	getAssignedIncidentTickets,
	getIncidentTicketById,
	addIncidentTicketComment,
	resolveIncidentTicket,
} from '../../api/api'

export default function AssignedTasks({ session }) {
	const [tickets, setTickets] = useState([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [selectedTicket, setSelectedTicket] = useState(null)
	const [noteInputs, setNoteInputs] = useState({})
	const [noteErrors, setNoteErrors] = useState({})
	const [actionLoading, setActionLoading] = useState(false)

	useEffect(() => {
		if (!session) return
		loadTickets()
	}, [session])

	async function loadTickets() {
		setLoading(true)
		setError('')
		try {
				const response = await getAssignedIncidentTickets('IN_PROGRESS')
			const list = Array.isArray(response) ? response : []
				setTickets(list)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unable to load assigned tasks right now.')
		} finally {
			setLoading(false)
		}
	}

	async function openTicket(ticketId) {
		setSelectedTicket(null)
		setActionLoading(true)
		try {
			const data = await getIncidentTicketById(ticketId)
			setSelectedTicket(data)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unable to load ticket details.')
		} finally {
			setActionLoading(false)
		}
	}

	function handleNoteChange(ticketId, value) {
		setNoteInputs((s) => ({ ...s, [ticketId]: value }))
		setNoteErrors((current) => ({ ...current, [ticketId]: '' }))
	}

	async function handleAddNote(ticketId) {
		const body = (noteInputs[ticketId] || '').trim()
		if (!body) return
		setActionLoading(true)
		setError('')
		try {
			await addIncidentTicketComment(ticketId, { body })
			const updated = await getIncidentTicketById(ticketId)
			setSelectedTicket(updated)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unable to add note right now.')
		} finally {
			setActionLoading(false)
		}
	}

	async function handleResolve(ticketId) {
		const resolutionNotes = (noteInputs[ticketId] || '').trim()
		if (!resolutionNotes) {
			setNoteErrors((current) => ({
				...current,
				[ticketId]: 'Resolution note is required before marking this ticket as resolved.',
			}))
			setError('Resolution notes are required. Please add notes before marking this ticket as resolved.')
			if (!selectedTicket || selectedTicket.id !== ticketId) {
				await openTicket(ticketId)
			}
			return
		}

		const confirmation = await Swal.fire({
			title: 'Mark ticket as resolved?',
			text: 'This will move the ticket to resolved tasks.',
			icon: 'question',
			showCancelButton: true,
			confirmButtonText: 'Yes, resolve it',
			cancelButtonText: 'Cancel',
			confirmButtonColor: '#059669',
		})
		if (!confirmation.isConfirmed) return

		setActionLoading(true)
		setError('')
		try {
			await resolveIncidentTicket(ticketId, { resolutionNotes })
			// remove it from the local assigned list
			setTickets((current) => current.filter((t) => t.id !== ticketId))
			setSelectedTicket(null)

			// navigate to resolved tab
			const pathname = window.location.pathname
			const query = new URLSearchParams(window.location.search)
			query.set('tab', 'resolved')
			window.history.pushState(null, '', `${pathname}?${query.toString()}`)
			window.dispatchEvent(new PopStateEvent('popstate'))
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unable to resolve ticket right now.')
		} finally {
			setActionLoading(false)
		}
	}

	return (
		<div className="space-y-4">
			<div>
				<h2 className="text-xl font-semibold text-slate-900">Assigned Tasks</h2>
				<p className="mt-1 text-sm text-slate-500">Tickets currently assigned to you.</p>
			</div>

			{loading && <p className="text-sm text-slate-500">Loading assigned tasks…</p>}
			{error && <p className="text-sm text-red-600">{error}</p>}

			{!loading && tickets.length === 0 && (
				<p className="text-sm text-slate-500">No assigned tickets at the moment.</p>
			)}

			<ul className="space-y-3">
				{tickets.map((ticket) => (
					<li key={ticket.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
						<div className="flex items-start justify-between">
							<div>
								<p className="text-sm font-semibold text-slate-900">{ticket.title}</p>
								<div className="mt-2 flex flex-wrap gap-2 text-xs">
									<span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">#{ticket.id}</span>
									<span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">{ticket.category ?? 'GENERAL'}</span>
									<span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">Priority: {ticket.priority ?? '-'}</span>
									<span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">{ticket.status ?? 'IN_PROGRESS'}</span>
								</div>
								<p className="mt-2 text-xs text-slate-500">Location: {ticket.location ?? (ticket.resourceId ? `Resource ${ticket.resourceId}` : 'Not provided')}</p>
								{ticket.description && (
									<p className="mt-2 line-clamp-2 text-xs text-slate-600">{ticket.description}</p>
								)}
							</div>

							<div className="ml-4 flex gap-2">
								<button
									type="button"
									onClick={() => openTicket(ticket.id)}
									className="rounded-md px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
								>
									View
								</button>
								<button
									type="button"
									onClick={() => handleResolve(ticket.id)}
									disabled={actionLoading}
									className="rounded-md bg-emerald-600 px-3 py-1 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
								>
									Mark resolved
								</button>
							</div>
						</div>

						{selectedTicket && selectedTicket.id === ticket.id && (
							<div className="mt-3 border-t pt-3">
								<div className="mb-3 flex justify-end">
									<button
										type="button"
										onClick={() => setSelectedTicket(null)}
										className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
									>
										Close details
									</button>
								</div>

								<div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
									<p>
										<span className="font-semibold text-slate-700">Ticket ID:</span> #{selectedTicket.id}
									</p>
									<p>
										<span className="font-semibold text-slate-700">Created:</span> {selectedTicket.createdAt ?? '-'}
									</p>
									<p>
										<span className="font-semibold text-slate-700">Category:</span> {selectedTicket.category ?? '-'}
									</p>
									<p>
										<span className="font-semibold text-slate-700">Priority:</span> {selectedTicket.priority ?? '-'}
									</p>
									<p>
										<span className="font-semibold text-slate-700">Contact:</span> {selectedTicket.preferredContactName ?? '-'}
									</p>
									<p>
										<span className="font-semibold text-slate-700">Email:</span> {selectedTicket.preferredContactEmail ?? '-'}
									</p>
								</div>

								<p className="mt-3 text-sm text-slate-700">{selectedTicket.description}</p>

								{Array.isArray(selectedTicket.attachments) && selectedTicket.attachments.length > 0 && (
									<div className="mt-3">
										<h3 className="text-sm font-medium text-slate-900">Attachments</h3>
										<div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
										{selectedTicket.attachments.map((a) => (
											<a
												key={a.id}
												href={a.url}
												target="_blank"
												rel="noreferrer"
												className="block overflow-hidden rounded border border-slate-200 bg-white"
											>
												<img src={a.url} alt={`attachment-${a.id ?? 'file'}`} className="h-24 w-full object-cover" />
											</a>
										))}
										</div>
									</div>
								)}

								<div className="mt-3 space-y-2">
									<h3 className="text-sm font-medium text-slate-900">Notes</h3>
									{Array.isArray(selectedTicket.comments) && selectedTicket.comments.length > 0 ? (
										selectedTicket.comments.map((c) => (
											<div key={c.id} className="rounded-md bg-white p-2 text-sm text-slate-700">
												<div className="text-xs text-slate-500">{c.authorName}</div>
												<div className="mt-1">{c.body}</div>
											</div>
										))
									) : (
										<p className="text-sm text-slate-500">No notes yet.</p>
									)}
								</div>

								<div className="mt-3">
									<textarea
										value={noteInputs[ticket.id] || ''}
										onChange={(e) => handleNoteChange(ticket.id, e.target.value)}
										placeholder="Add a note or resolution comment"
										className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-900 ${noteErrors[ticket.id] ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
										rows={3}
									/>
									{noteErrors[ticket.id] && <p className="mt-1 text-sm font-medium text-red-600">{noteErrors[ticket.id]}</p>}

									<div className="mt-2 flex items-center gap-2">
										<button
											type="button"
											onClick={() => handleAddNote(ticket.id)}
											disabled={actionLoading}
											className="rounded-md bg-sky-600 px-3 py-1 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
										>
											Add note
										</button>
										<button
											type="button"
											onClick={() => handleResolve(ticket.id)}
											disabled={actionLoading}
											className="rounded-md bg-emerald-600 px-3 py-1 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
										>
											Mark resolved
										</button>
									</div>
								</div>
							</div>
						)}
					</li>
				))}
			</ul>
		</div>
	)
}
