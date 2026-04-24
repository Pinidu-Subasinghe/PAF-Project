import { useEffect, useState } from 'react'
import { getAssignedIncidentTickets, getIncidentTicketById } from '../../api/api'

export default function ResolvedTasks({ session }) {
	const [tickets, setTickets] = useState([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [selectedTicket, setSelectedTicket] = useState(null)

	useEffect(() => {
		if (!session) return
		loadResolved()
	}, [session])

	async function loadResolved() {
		setLoading(true)
		setError('')
		try {
				const response = await getAssignedIncidentTickets('RESOLVED')
			const list = Array.isArray(response) ? response : []
				setTickets(list)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unable to load resolved tickets right now.')
		} finally {
			setLoading(false)
		}
	}

	async function openTicket(ticketId) {
		setSelectedTicket(null)
		try {
			const data = await getIncidentTicketById(ticketId)
			setSelectedTicket(data)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unable to load ticket details.')
		}
	}

	return (
		<div className="space-y-4">
			<div>
				<h2 className="text-xl font-semibold text-slate-900">Resolved Tasks</h2>
				<p className="mt-1 text-sm text-slate-500">Tickets you resolved previously.</p>
			</div>

			{loading && <p className="text-sm text-slate-500">Loading resolved tickets…</p>}
			{error && <p className="text-sm text-red-600">{error}</p>}

			{!loading && tickets.length === 0 && (
				<p className="text-sm text-slate-500">No resolved tickets yet.</p>
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
									<span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">{ticket.status ?? 'RESOLVED'}</span>
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

								<p className="text-sm text-slate-700">{selectedTicket.description}</p>

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

								{selectedTicket.resolutionNotes && (
									<div className="mt-3 rounded-md bg-white p-3 text-sm text-slate-700">
										<h4 className="text-xs text-slate-500">Resolution notes</h4>
										<div className="mt-1">{selectedTicket.resolutionNotes}</div>
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
										<p className="text-sm text-slate-500">No notes recorded.</p>
									)}
								</div>
							</div>
						)}
					</li>
				))}
			</ul>
		</div>
	)
}
