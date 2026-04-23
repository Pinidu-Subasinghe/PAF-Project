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
		// eslint-disable-next-line react-hooks/exhaustive-deps
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
								<p className="mt-1 text-xs text-slate-500">{ticket.location ?? (ticket.resourceId ? `Resource ${ticket.resourceId}` : '')}</p>
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
								<p className="text-sm text-slate-700">{selectedTicket.description}</p>

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
