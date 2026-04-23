import { useCallback, useEffect, useState } from 'react'
import { getIncidentTickets } from '../../api/api'
import AdminTicketManagement from './AdminTicketManagement'

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

function readTicketIdFromLocation() {
	const queryParams = new URLSearchParams(window.location.search)
	const raw = queryParams.get('ticketId')?.trim()
	if (!raw) return null

	const parsed = Number(raw)
	return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export default function AdminTickets() {
	const [tickets, setTickets] = useState([])
	const [isLoading, setIsLoading] = useState(true)
	const [errorMessage, setErrorMessage] = useState('')
	const [selectedTicketId, setSelectedTicketId] = useState(() => readTicketIdFromLocation())

	const loadTickets = useCallback(async () => {
		setIsLoading(true)
		setErrorMessage('')

		try {
			const response = await getIncidentTickets()
			setTickets(Array.isArray(response) ? response : [])
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : 'Unable to load tickets right now.')
		} finally {
			setIsLoading(false)
		}
	}, [])

	useEffect(() => {
		loadTickets()
	}, [loadTickets])

	useEffect(() => {
		const syncSelectedTicket = () => {
			setSelectedTicketId(readTicketIdFromLocation())
		}

		window.addEventListener('popstate', syncSelectedTicket)
		window.addEventListener('hashchange', syncSelectedTicket)

		return () => {
			window.removeEventListener('popstate', syncSelectedTicket)
			window.removeEventListener('hashchange', syncSelectedTicket)
		}
	}, [])

	const openTicket = (ticketId) => {
		const pathname = window.location.pathname
		const queryParams = new URLSearchParams(window.location.search)
		queryParams.set('tab', 'tickets')
		queryParams.set('ticketId', String(ticketId))
		window.history.pushState(null, '', `${pathname}?${queryParams.toString()}`)
		setSelectedTicketId(ticketId)
	}

	const backToList = () => {
		const pathname = window.location.pathname
		const queryParams = new URLSearchParams(window.location.search)
		queryParams.delete('ticketId')
		window.history.pushState(null, '', `${pathname}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`)
		setSelectedTicketId(null)
		loadTickets()
	}

	if (selectedTicketId) {
		return (
			<AdminTicketManagement ticketId={selectedTicketId} onBack={backToList} />
		)
	}

	return (
		<div className="space-y-4">
			{errorMessage && (
				<div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
					{errorMessage}
				</div>
			)}

			{isLoading ? (
				<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
					Loading tickets...
				</div>
			) : tickets.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
					No tickets found.
				</div>
			) : (
				tickets.map((ticket) => (
					<button
						key={ticket.id}
						type="button"
						onClick={() => openTicket(ticket.id)}
						className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:bg-slate-50 sm:p-5"
					>
						<div className="flex flex-wrap items-start justify-between gap-3">
							<div className="min-w-0">
								<p className="truncate text-sm font-semibold text-slate-900">{ticket.title}</p>
								<p className="mt-1 text-xs text-slate-500">Ticket #{ticket.id}</p>
							</div>
							<div className="flex flex-wrap gap-2">
								<span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClasses[ticket.status] ?? 'bg-slate-100 text-slate-700'}`}>
									{formatLabel(ticket.status)}
								</span>
								<span className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityBadgeClasses[ticket.priority] ?? 'bg-slate-100 text-slate-700'}`}>
									{formatLabel(ticket.priority)}
								</span>
							</div>
						</div>

						<p className="mt-3 text-xs text-slate-500">
							{formatLabel(ticket.category)} | {ticket.location || ticket.resourceId || 'Not provided'}
						</p>
					</button>
				))
			)}
		</div>
	)
}

