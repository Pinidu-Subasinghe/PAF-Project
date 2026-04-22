import { useEffect, useMemo, useState } from 'react'
import DashboardShell from '../components/DashboardShell'
import Profile from '../components/user/Profile'
import ChangePassword from '../components/user/ChangePassword'
import BookingList from '../components/booking/BookingList'
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
		const syncActiveItemWithLocation = () => {
			const requestedTab = readRequestedTab(navItems)
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

	const contentById = {
		profile: <Profile session={session} />,
		'change-password': <ChangePassword session={session} />,
		'my-bookings': (
			<div className="space-y-4">
				<div>
					<h2 className="text-xl font-semibold text-slate-900">My bookings</h2>
					<p className="mt-1 text-sm text-slate-500">Review your reservation history and current booking statuses.</p>
				</div>
				<BookingList scope="my" />
			</div>
		),
		'my-tickets': (
			<PlaceholderPanel
				title="My tickets"
				description="View your support tickets and their statuses."
				items={[
					{ title: 'Ticket #123', detail: 'Status: Open' },
					{ title: 'Ticket #98', detail: 'Status: In review' },
				]}
			/>
		),
	}

	const activeContent = contentById[activeItemId] ?? contentById.profile


	return (
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
	)
}
