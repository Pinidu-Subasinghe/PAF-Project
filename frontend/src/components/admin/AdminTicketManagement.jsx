import { useCallback, useEffect, useMemo, useState } from 'react'
import {
	assignIncidentTicket,
	getAdminUsers,
	getIncidentTicketById,
	rejectIncidentTicket,
	resolveIncidentTicket,
} from '../../api/api'
import { authSessionChangeEvent, readAuthSession } from '../../utils/authSession'
import UserTicketInfo from '../user/UserTicketInfo'

function useAuthSession() {
	const [session, setSession] = useState(() => readAuthSession())

	useEffect(() => {
		const syncSession = () => setSession(readAuthSession())
		window.addEventListener('storage', syncSession)
		window.addEventListener(authSessionChangeEvent, syncSession)

		return () => {
			window.removeEventListener('storage', syncSession)
			window.removeEventListener(authSessionChangeEvent, syncSession)
		}
	}, [])

	return session
}

export default function AdminTicketManagement({ ticketId, onBack }) {
	const session = useAuthSession()
	const [ticket, setTicket] = useState(null)
	const [isLoading, setIsLoading] = useState(true)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [errorMessage, setErrorMessage] = useState('')
	const [adminUsers, setAdminUsers] = useState([])
	const [assignTechnicianId, setAssignTechnicianId] = useState('')
	const [rejectReason, setRejectReason] = useState('')
	const [resolutionNotes, setResolutionNotes] = useState('')

	const currentAdminUser = useMemo(
		() => adminUsers.find((user) => user.email?.toLowerCase() === session?.email?.toLowerCase()) ?? null,
		[adminUsers, session?.email],
	)

	const loadTicket = useCallback(async () => {
		if (!ticketId) {
			setTicket(null)
			setIsLoading(false)
			return
		}

		setIsLoading(true)
		setErrorMessage('')

		try {
			const response = await getIncidentTicketById(ticketId)
			setTicket(response)
			setAssignTechnicianId((currentId) => {
				if (currentId) {
					return currentId
				}

				if (response?.assignedToUserId) {
					return String(response.assignedToUserId)
				}

				return ''
			})
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : 'Unable to load ticket details right now.')
			setTicket(null)
		} finally {
			setIsLoading(false)
		}
	}, [ticketId])

	const loadAdminUsers = useCallback(async () => {
		try {
			const response = await getAdminUsers()
			const nextUsers = (Array.isArray(response) ? response : []).filter((user) => user.role === 'TECHNICIAN')
			setAdminUsers(nextUsers)

			setAssignTechnicianId((currentId) => {
				if (currentId) {
					return currentId
				}

				return String(nextUsers[0]?.id ?? '')
			})
		} catch {
			setAdminUsers([])
		}
	}, [])

	useEffect(() => {
		loadTicket()
		loadAdminUsers()
	}, [loadAdminUsers, loadTicket])

	const refresh = useCallback(async () => {
		await loadTicket()
		await loadAdminUsers()
	}, [loadAdminUsers, loadTicket])

	const handleAssign = async () => {
		if (!ticket || !assignTechnicianId) {
			return
		}

		setIsSubmitting(true)
		setErrorMessage('')
		try {
			await assignIncidentTicket(ticket.id, { technicianId: Number(assignTechnicianId) })
			await refresh()
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : 'Unable to assign the ticket.')
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleReject = async () => {
		if (!ticket || !rejectReason.trim()) {
			setErrorMessage('Rejection reason is required.')
			return
		}

		setIsSubmitting(true)
		setErrorMessage('')
		try {
			await rejectIncidentTicket(ticket.id, { reason: rejectReason.trim() })
			await refresh()
			setRejectReason('')
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : 'Unable to reject the ticket.')
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleResolve = async () => {
		if (!ticket || !resolutionNotes.trim()) {
			setErrorMessage('Resolution notes are required.')
			return
		}

		setIsSubmitting(true)
		setErrorMessage('')
		try {
			await resolveIncidentTicket(ticket.id, { resolutionNotes: resolutionNotes.trim() })
			await refresh()
			setResolutionNotes('')
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : 'Unable to resolve the ticket.')
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<div className="space-y-4">
			<button
				type="button"
				onClick={onBack}
				className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
			>
				Back to tickets
			</button>

			{errorMessage && (
				<div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
					{errorMessage}
				</div>
			)}

			{isLoading ? (
				<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
					Loading ticket details...
				</div>
			) : (
				<UserTicketInfo
					ticket={ticket}
					isAdminScope
					currentUserEmail={session?.email ?? ''}
					currentAdminUser={currentAdminUser}
					adminUsers={adminUsers}
					assignTechnicianId={assignTechnicianId}
					onAssignTechnicianIdChange={setAssignTechnicianId}
					onAssign={handleAssign}
					rejectReason={rejectReason}
					onRejectReasonChange={setRejectReason}
					onReject={handleReject}
					resolutionNotes={resolutionNotes}
					onResolutionNotesChange={setResolutionNotes}
					onResolve={handleResolve}
					onClose={() => {}}
					onRefresh={refresh}
					isSubmitting={isSubmitting}
				/>
			)}
		</div>
	)
}

