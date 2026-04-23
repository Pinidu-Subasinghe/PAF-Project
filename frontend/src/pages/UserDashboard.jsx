import { useEffect, useMemo, useState } from 'react'
import DashboardShell from '../components/DashboardShell'
import Profile from '../components/user/Profile'
import ChangePassword from '../components/user/ChangePassword'
import UserRaiseTicket from '../components/user/UserRaiseTicket'
import UserTicketManagement from '../components/user/UserTicketManagement'
import UserTickets from '../components/user/UserTickets'
import BookingList from '../components/booking/BookingList'
import { deleteIncidentTicket, getMyIncidentTickets } from '../api/api'
import { authSessionChangeEvent, readAuthSession } from '../utils/authSession'
import { userNavItems, adminNavItems } from '../utils/dashboardNav'

function PlaceholderPanel({ title, description, items }) {
	return (
		<div className="space-y-4">
			<div>
				<h2 className="text-xl font-semibold text-slate-900">{title}</h2>
				<p className="mt-1 text-sm text-slate-500">{description}</p>
			</div>
			<div className="grid gap-3 sm:grid-cols-2">
				{items.map((item) => (
					<div key={item.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
						<p className="text-sm font-semibold text-slate-900">{item.title}</p>
						<p className="mt-1 text-xs text-slate-500">{item.detail}</p>
					</div>
				))}
			</div>
		</div>
	)
}

function readRequestedTab(navItems) {
	const queryParams = new URLSearchParams(window.location.search)
	const requestedTab = queryParams.get('tab')?.trim()

	if (!requestedTab) {
		return null
	}

	return navItems.some((item) => item.id === requestedTab) ? requestedTab : null
}

export default function UserDashboard() {
	const [session, setSession] = useState(() => readAuthSession())
	const [raiseTicketBooking, setRaiseTicketBooking] = useState(null)
	const [myTickets, setMyTickets] = useState([])
	const [ticketsLoading, setTicketsLoading] = useState(false)
	const [ticketsError, setTicketsError] = useState('')
	const [deletingTicketIds, setDeletingTicketIds] = useState([])
	const [selectedTicketId, setSelectedTicketId] = useState(() => {
		const queryParams = new URLSearchParams(window.location.search)
		const rawTicketId = queryParams.get('ticketId')?.trim()
		if (!rawTicketId) {
			return null
		}

		const parsedTicketId = Number(rawTicketId)
		return Number.isFinite(parsedTicketId) && parsedTicketId > 0 ? parsedTicketId : null
	})

	useEffect(() => {
		const syncSession = () => {
			setSession(readAuthSession())
		}

		window.addEventListener('storage', syncSession)
		window.addEventListener(authSessionChangeEvent, syncSession)

		return () => {
			window.removeEventListener('storage', syncSession)
			window.removeEventListener(authSessionChangeEvent, syncSession)
		}
	}, [])

	if (!session) {
		return (
			<main className="min-h-screen bg-slate-50">
				<div className="mx-auto w-full max-w-2xl px-4 py-16 text-center">
					<h1 className="text-2xl font-semibold text-slate-900">Sign in required</h1>
					<p className="mt-2 text-sm text-slate-500">
						Please sign in to view your dashboard and profile information.
					</p>
					<a
						href="/login"
						className="mt-6 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
					>
						Go to login
					</a>
				</div>
			</main>
		)
	}

	const role = session?.role ?? 'USER'
	const navItems = useMemo(() => (role === 'ADMIN' ? adminNavItems : userNavItems), [role])
	const [activeItemId, setActiveItemId] = useState(() => readRequestedTab(navItems) ?? navItems[0].id)

	useEffect(() => {
		setActiveItemId((currentActiveItemId) => {
			const requestedTab = readRequestedTab(navItems)
			if (requestedTab) {
				return requestedTab
			}

			return navItems.some((item) => item.id === currentActiveItemId)
				? currentActiveItemId
				: navItems[0].id
		})
	}, [navItems])

	useEffect(() => {
		if (!session) {
			return
		}

		const loadTickets = async () => {
			setTicketsLoading(true)
			setTicketsError('')
			try {
				const response = await getMyIncidentTickets()
				setMyTickets(Array.isArray(response) ? response : [])
			} catch (error) {
				setTicketsError(error instanceof Error ? error.message : 'Unable to load tickets right now.')
			} finally {
				setTicketsLoading(false)
			}
		}

		loadTickets()
	}, [session])

	useEffect(() => {
		const syncActiveItemWithLocation = () => {
			const requestedTab = readRequestedTab(navItems)
			const queryParams = new URLSearchParams(window.location.search)
			const rawTicketId = queryParams.get('ticketId')?.trim()
			const parsedTicketId = rawTicketId ? Number(rawTicketId) : null
			setSelectedTicketId(Number.isFinite(parsedTicketId) && parsedTicketId > 0 ? parsedTicketId : null)
			if (requestedTab) {
				setActiveItemId(requestedTab)
			}
		}

		window.addEventListener('popstate', syncActiveItemWithLocation)
		window.addEventListener('hashchange', syncActiveItemWithLocation)

		return () => {
			window.removeEventListener('popstate', syncActiveItemWithLocation)
			window.removeEventListener('hashchange', syncActiveItemWithLocation)
		}
	}, [navItems])

	const openMyTicket = (ticket) => {
		const pathname = window.location.pathname
		const queryParams = new URLSearchParams(window.location.search)
		queryParams.set('tab', 'my-tickets')
		queryParams.set('ticketId', String(ticket.id))
		window.history.pushState(null, '', `${pathname}?${queryParams.toString()}`)
		setSelectedTicketId(ticket.id)
	}

	const backToMyTickets = () => {
		const pathname = window.location.pathname
		const queryParams = new URLSearchParams(window.location.search)
		queryParams.delete('ticketId')
		window.history.pushState(null, '', `${pathname}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`)
		setSelectedTicketId(null)
		setTicketsLoading(true)
		setTicketsError('')
		getMyIncidentTickets()
			.then((response) => setMyTickets(Array.isArray(response) ? response : []))
			.catch((error) => setTicketsError(error instanceof Error ? error.message : 'Unable to load tickets right now.'))
			.finally(() => setTicketsLoading(false))
	}

	const handleDeleteTicket = async (ticket) => {
		if (!ticket?.id) {
			return
		}

		const canDelete = ['OPEN', 'RESOLVED', 'REJECTED', 'CLOSED'].includes(ticket.status)
		if (!canDelete) {
			setTicketsError('Ticket cannot be deleted while it is in progress.')
			return
		}

		const confirmed = window.confirm(`Delete ticket #${ticket.id} permanently? This action cannot be undone.`)
		if (!confirmed) {
			return
		}

		setTicketsError('')
		setDeletingTicketIds((current) => [...current, ticket.id])
		try {
			await deleteIncidentTicket(ticket.id)
			setMyTickets((current) => current.filter((item) => item.id !== ticket.id))
		} catch (error) {
			setTicketsError(error instanceof Error ? error.message : 'Unable to delete ticket right now.')
		} finally {
			setDeletingTicketIds((current) => current.filter((id) => id !== ticket.id))
		}
	}

	const contentById = {
		profile: <Profile session={session} />,
		'change-password': <ChangePassword session={session} />,
		'my-bookings': (
			<div className="space-y-4">
				<div>
					<h2 className="text-xl font-semibold text-slate-900">My bookings</h2>
					<p className="mt-1 text-sm text-slate-500">Review your reservation history and current booking statuses.</p>
				</div>
				<BookingList scope="my" onRaiseTicket={setRaiseTicketBooking} />
			</div>
		),
		'my-tickets': (
			selectedTicketId
				? <UserTicketManagement ticketId={selectedTicketId} onBack={backToMyTickets} />
				: (
					<UserTickets
						tickets={myTickets}
						isLoading={ticketsLoading}
						errorMessage={ticketsError}
						onSelectTicket={openMyTicket}
						onDeleteTicket={handleDeleteTicket}
						deletingTicketIds={deletingTicketIds}
					/>
				)
		),
	}

	const activeContent = contentById[activeItemId] ?? contentById.profile


	return (
		<>
			<DashboardShell
				title={role === 'ADMIN' ? 'Admin Dashboard' : 'User Dashboard'}
				subtitle={
					role === 'ADMIN'
						? 'Monitor campus operations and administrative tasks.'
						: 'Track your campus activity and services in one place.'
				}
				items={navItems}
				activeItemId={activeItemId}
				onSelect={setActiveItemId}
			>
				{activeContent}
			</DashboardShell>
			<UserRaiseTicket
				isOpen={Boolean(raiseTicketBooking)}
				booking={raiseTicketBooking}
				session={session}
				onClose={() => setRaiseTicketBooking(null)}
				onCreated={() => {
					setRaiseTicketBooking(null)
					setActiveItemId('my-tickets')
				}}
			/>
		</>
	)
}
