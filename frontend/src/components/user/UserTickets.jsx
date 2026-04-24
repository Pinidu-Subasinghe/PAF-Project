import { HiOutlineTrash } from 'react-icons/hi2'
import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'

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

export default function UserTickets({
	tickets = [],
	isLoading = false,
	errorMessage = '',
	onSelectTicket,
	onDeleteTicket,
	deletingTicketIds = [],
}) {
	const canDeleteTicket = (status) => ['OPEN', 'RESOLVED', 'REJECTED', 'CLOSED'].includes(status)

	const handleDeleteClick = async (ticket) => {
		const canDelete = canDeleteTicket(ticket?.status)
		if (!ticket?.id || !canDelete || deletingTicketIds.includes(ticket.id)) {
			return
		}

		const result = await Swal.fire({
			title: 'Delete ticket?',
			text: `Delete ticket #${ticket.id} permanently? This action cannot be undone.`,
			icon: 'warning',
			showCancelButton: true,
			confirmButtonText: 'Yes, delete',
			cancelButtonText: 'Cancel',
			confirmButtonColor: '#dc2626',
		})

		if (!result.isConfirmed) {
			return
		}

		onDeleteTicket?.(ticket)
	}

	return (
		<div className="space-y-6">
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
					<div
						key={ticket.id}
						className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:bg-slate-50 sm:p-5"
					>
						<div className="flex flex-wrap items-start justify-between gap-3">
							<div className="min-w-0">
								<p className="truncate text-sm font-semibold text-slate-900">{ticket.title}</p>
								<p className="mt-1 text-xs text-slate-500">Ticket #{ticket.id}</p>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClasses[ticket.status] ?? 'bg-slate-100 text-slate-700'}`}>
									{formatLabel(ticket.status)}
								</span>
								<span className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityBadgeClasses[ticket.priority] ?? 'bg-slate-100 text-slate-700'}`}>
									{formatLabel(ticket.priority)}
								</span>
								<button
									type="button"
									onClick={() => {
										void handleDeleteClick(ticket)
									}}
									disabled={!canDeleteTicket(ticket.status) || deletingTicketIds.includes(ticket.id)}
									className="rounded-full p-2 text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
									aria-label={`Delete ticket ${ticket.id}`}
									title={canDeleteTicket(ticket.status) ? 'Delete ticket' : 'Cannot delete while ticket is in progress'}
								>
									<HiOutlineTrash className="h-5 w-5" />
								</button>
							</div>
						</div>

						<p className="mt-3 line-clamp-2 text-sm text-slate-600">{ticket.description}</p>

						<dl className="mt-4 grid gap-3 text-xs text-slate-500 sm:grid-cols-2">
							<div>
								<dt className="uppercase tracking-wide text-slate-400">Reason</dt>
								<dd className="mt-1 font-medium text-slate-700">{formatLabel(ticket.category)}</dd>
							</div>
							<div>
								<dt className="uppercase tracking-wide text-slate-400">Location</dt>
								<dd className="mt-1 font-medium text-slate-700">{ticket.location || ticket.resourceId || 'Not provided'}</dd>
							</div>
						</dl>

						<div className="mt-4">
							<button
								type="button"
								onClick={() => onSelectTicket?.(ticket)}
								className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
							>
								View details
							</button>
						</div>
					</div>
				))
			)}

			{errorMessage && (
				<div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
					{errorMessage}
				</div>
			)}
		</div>
	)
}
